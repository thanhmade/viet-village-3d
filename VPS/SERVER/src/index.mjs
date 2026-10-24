import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import argon2 from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import pg from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, max: 10});
const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).filter(Boolean);
const google = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const secure = process.env.COOKIE_SECURE === 'true';
const cookieOpts = {httpOnly:true, secure, sameSite:'lax', path:'/'};
const hashToken = token => createHash('sha256').update(token).digest('hex');
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
if(process.env.NODE_ENV==='production' && (!secure || !origins.every(o=>o.startsWith('https://')))) throw Error('Production requires secure cookies and HTTPS origins');
app.use(helmet());
app.use(cors({origin(origin,cb){ if(!origin || origins.includes(origin)) return cb(null,true); cb(new Error('Origin denied'));},credentials:true}));
app.use(express.json({limit:'16kb'}));
app.use(cookieParser());
const limiter=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false});
function allowedOrigin(req,res,next){const origin=req.get('Origin'); const referer=req.get('Referer'); if(origin){if(origins.includes(origin))return next(); return res.status(403).json({error:'origin_denied'});} if(referer){try{if(origins.includes(new URL(referer).origin))return next();}catch{} } return res.status(403).json({error:'origin_required'});}
function validEmail(v){return typeof v==='string' && v.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}}) : null;
async function sendMail(to,subject,content){if(mailer){await mailer.sendMail({from:process.env.MAIL_FROM,to,subject,text:content});return;}if(process.env.NODE_ENV==='production')throw Error('SMTP required in production');console.log('DEV MAIL',to,subject,content);}
async function createOneTimeToken(userId,purpose,minutes){const token=randomBytes(32).toString('base64url');await pool.query("INSERT INTO auth_tokens(user_id,token_hash,purpose,expires_at) VALUES($1,$2,$3,now()+($4::int * interval '1 minute'))",[userId,hashToken(token),purpose,minutes]);return token;}
async function session(res,userId){const raw=randomBytes(32).toString('base64url'); await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hashToken(raw),userId]);res.cookie('vv_session',raw,{...cookieOpts,maxAge:7*86400000});}
async function auth(req,res,next){try{let raw=req.cookies.vv_session;if(!raw)return res.status(401).json({error:'unauthorized'});let {rows}=await pool.query('SELECT u.id,u.email,u.display_name,u.role FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT u.disabled',[hashToken(raw)]);if(!rows.length)return res.status(401).json({error:'unauthorized'});req.user=rows[0];next();}catch(e){next(e);}}
function adminOnly(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'forbidden'});next();}
app.get('/health',async(req,res,next)=>{try{await pool.query('SELECT 1');res.json({status:'ok'});}catch(e){next(e);}});
app.post('/auth/register',limiter,allowedOrigin,async(req,res,next)=>{try{
 const {email,password,displayName}=req.body; if(!validEmail(email)||typeof password!=='string'||password.length<12||password.length>128||typeof displayName!=='string'||displayName.trim().length<2||displayName.length>80)return res.status(400).json({error:'invalid_input'});
 const pw=await argon2.hash(password,{type:argon2.argon2id});const {rows}=await pool.query('INSERT INTO users(email,display_name,password_hash) VALUES($1,$2,$3) RETURNING id',[email.trim().toLowerCase(),displayName.trim(),pw]);const token=await createOneTimeToken(rows[0].id,'verify',30);await sendMail(email,'Xác minh tài khoản VIET VILLAGE',`${process.env.PUBLIC_APP_URL}/verify?token=${encodeURIComponent(token)}`);res.status(201).json({ok:true,emailVerificationRequired:true});
 }catch(e){if(e.code==='23505')return res.status(409).json({error:'email_exists'});next(e);}});
app.post('/auth/login',limiter,allowedOrigin,async(req,res,next)=>{try{
 const {email,password}=req.body;if(!validEmail(email)||typeof password!=='string')return res.status(400).json({error:'invalid_credentials'});
 const {rows}=await pool.query('SELECT * FROM users WHERE lower(email)=lower($1) AND NOT disabled',[email]);const u=rows[0];if(!u?.password_hash || !await argon2.verify(u.password_hash,password))return res.status(401).json({error:'invalid_credentials'});
 if(!u.email_verified)return res.status(403).json({error:'email_unverified'});await session(res,u.id);res.json({ok:true});
 }catch(e){next(e);}});
app.post('/auth/google',limiter,allowedOrigin,async(req,res,next)=>{let client;try{
 if(!process.env.GOOGLE_CLIENT_ID)return res.status(503).json({error:'google_not_configured'});
 const credential=req.body?.credential;if(typeof credential!=='string'||credential.length>8192)return res.status(400).json({error:'invalid_credential'});
 const ticket=await google.verifyIdToken({idToken:credential,audience:process.env.GOOGLE_CLIENT_ID});const p=ticket.getPayload();if(!p?.sub||!p.email||!p.email_verified)return res.status(401).json({error:'google_identity_unverified'});
 client=await pool.connect();await client.query('BEGIN');
 let result=await client.query("SELECT u.id FROM auth_identities a JOIN users u ON u.id=a.user_id WHERE a.provider='google' AND a.provider_subject=$1 AND NOT u.disabled",[p.sub]);let userId=result.rows[0]?.id;
 if(!userId){let existing=await client.query('SELECT id FROM users WHERE lower(email)=lower($1)',[p.email]);if(existing.rows.length){await client.query('ROLLBACK');return res.status(409).json({error:'account_link_required',message:'Verify existing account before linking Google'});}
 let created=await client.query('INSERT INTO users(email,display_name,email_verified) VALUES($1,$2,true) RETURNING id',[p.email.toLowerCase(),(p.name||'Người chơi').slice(0,80)]);userId=created.rows[0].id;await client.query("INSERT INTO auth_identities(user_id,provider,provider_subject) VALUES($1,'google',$2)",[userId,p.sub]);}
 await client.query('COMMIT');client.release();client=null;await session(res,userId);res.json({ok:true});
 }catch(e){if(client){await client.query('ROLLBACK').catch(()=>{});client.release();}if(e.code==='23505')return res.status(409).json({error:'account_conflict'});if(e.message?.includes('token')||e.message?.includes('audience'))return res.status(401).json({error:'invalid_google_token'});next(e);}});
app.post('/auth/verify',limiter,allowedOrigin,async(req,res,next)=>{try{const token=req.body?.token;if(typeof token!=='string'||token.length>200)return res.status(400).json({error:'invalid_token'});const c=await pool.connect();try{await c.query('BEGIN');const r=await c.query("DELETE FROM auth_tokens WHERE token_hash=$1 AND purpose='verify' AND expires_at>now() RETURNING user_id",[hashToken(token)]);if(!r.rows.length){await c.query('ROLLBACK');return res.status(400).json({error:'expired_token'});}await c.query('UPDATE users SET email_verified=true WHERE id=$1',[r.rows[0].user_id]);await c.query('COMMIT');res.json({ok:true});}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}catch(e){next(e);}});
app.post('/auth/forgot',limiter,allowedOrigin,async(req,res,next)=>{try{const email=req.body?.email;if(validEmail(email)){const r=await pool.query('SELECT id FROM users WHERE lower(email)=lower($1) AND password_hash IS NOT NULL AND NOT disabled',[email]);if(r.rows.length){await pool.query("DELETE FROM auth_tokens WHERE user_id=$1 AND purpose='reset'",[r.rows[0].id]);const token=await createOneTimeToken(r.rows[0].id,'reset',15);await sendMail(email,'Đặt lại mật khẩu VIET VILLAGE',`${process.env.PUBLIC_APP_URL}/reset?token=${encodeURIComponent(token)}`);}}res.json({ok:true});}catch(e){next(e);}});
app.post('/auth/reset',limiter,allowedOrigin,async(req,res,next)=>{let c;try{const {token,password}=req.body||{};if(typeof token!=='string'||token.length>200||typeof password!=='string'||password.length<12||password.length>128)return res.status(400).json({error:'invalid_input'});const hash=await argon2.hash(password,{type:argon2.argon2id});c=await pool.connect();await c.query('BEGIN');const r=await c.query("DELETE FROM auth_tokens WHERE token_hash=$1 AND purpose='reset' AND expires_at>now() RETURNING user_id",[hashToken(token)]);if(!r.rows.length){await c.query('ROLLBACK');return res.status(400).json({error:'expired_token'});}await c.query('UPDATE users SET password_hash=$1,email_verified=true WHERE id=$2',[hash,r.rows[0].user_id]);await c.query('DELETE FROM sessions WHERE user_id=$1',[r.rows[0].user_id]);await c.query('COMMIT');res.json({ok:true});}catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});next(e);}finally{c?.release();}});
app.get('/auth/me',auth,(req,res)=>res.json({user:req.user}));
app.post('/auth/logout',allowedOrigin,async(req,res,next)=>{try{if(req.cookies.vv_session)await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(req.cookies.vv_session)]);res.clearCookie('vv_session',cookieOpts);res.json({ok:true});}catch(e){next(e);}});
app.get('/admin',auth,adminOnly,async(req,res,next)=>{try{const html=await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)),'admin.html'),'utf8');res.type('html').send(html);}catch(e){next(e);}});
app.get('/admin/api/overview',auth,adminOnly,async(req,res,next)=>{try{const [users,characters,sessions]=await Promise.all([pool.query('SELECT count(*)::int AS n FROM users'),pool.query('SELECT count(*)::int AS n FROM characters'),pool.query('SELECT count(*)::int AS n FROM sessions WHERE expires_at>now()')]);res.json({users:users.rows[0].n,characters:characters.rows[0].n,activeSessions:sessions.rows[0].n});}catch(e){next(e);}});
app.get('/admin/api/users',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query('SELECT id,email,display_name,role,email_verified,disabled,created_at FROM users ORDER BY created_at DESC LIMIT 100');res.json({users:r.rows});}catch(e){next(e);}});
const r2=process.env.R2_ENDPOINT&&process.env.R2_ACCESS_KEY_ID&&process.env.R2_SECRET_ACCESS_KEY?new S3Client({region:'auto',endpoint:process.env.R2_ENDPOINT,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}}):null;
app.post('/storage/presign',auth,allowedOrigin,limiter,async(req,res,next)=>{try{if(!r2||!process.env.R2_BUCKET)return res.status(503).json({error:'r2_not_configured'});const {contentType,size}=req.body||{};const allowed=new Set(['image/png','image/jpeg','image/webp','model/gltf-binary','application/pdf']);if(!allowed.has(contentType)||!Number.isSafeInteger(size)||size<1||size>20*1024*1024)return res.status(400).json({error:'unsupported_upload'});const key=`private/${req.user.id}/${randomBytes(16).toString('hex')}`;const url=await getSignedUrl(r2,new PutObjectCommand({Bucket:process.env.R2_BUCKET,Key:key,ContentType:contentType,Metadata:{owner:req.user.id}}),{expiresIn:120});await pool.query('INSERT INTO uploads(user_id,object_key,mime_type,declared_size) VALUES($1,$2,$3,$4)',[req.user.id,key,contentType,size]);res.json({url,key,expiresIn:120,requiredHeaders:{'Content-Type':contentType},maxDeclaredBytes:20*1024*1024});}catch(e){next(e);}});
app.get('/characters',auth,async(req,res,next)=>{try{const {rows}=await pool.query('SELECT id,name,level,exp,map_id FROM characters WHERE user_id=$1 ORDER BY created_at',[req.user.id]);res.json({characters:rows});}catch(e){next(e);}});
app.post('/characters',auth,allowedOrigin,async(req,res,next)=>{try{const name=req.body?.name;if(typeof name!=='string'||name.trim().length<2||name.length>40)return res.status(400).json({error:'invalid_name'});const {rows}=await pool.query('INSERT INTO characters(user_id,name) VALUES($1,$2) RETURNING id,name,level,exp,map_id',[req.user.id,name.trim()]);res.status(201).json({character:rows[0]});}catch(e){next(e);}});
app.use((err,req,res,next)=>{console.error('Request failure',err.code||err.name);res.status(500).json({error:'server_error'});});
app.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('VIET VILLAGE API ready'));
