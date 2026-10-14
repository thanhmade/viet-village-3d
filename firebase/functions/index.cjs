'use strict';
const {initializeApp} = require('firebase-admin/app');
const {getDatabase} = require('firebase-admin/database');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onValueDeleted} = require('firebase-functions/v2/database');
const {makeRoomService, RoomError} = require('./room-service.cjs');
const {makeExperienceService, ExperienceError} = require('./experience-service.cjs');
const {makeQuestService, QuestError} = require('./quest-service.cjs');
const emulated = process.env.FUNCTIONS_EMULATOR === 'true';
const projectId = process.env.GCLOUD_PROJECT || 'viet-village-3d';
if (emulated && (!projectId.startsWith('demo-') || !process.env.FIREBASE_DATABASE_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST))
  throw new Error('Local functions require a demo project and both database emulators.');
initializeApp({projectId, databaseURL: emulated
  ? `https://${projectId}.firebaseio.com`
  : 'https://viet-village-3d-default-rtdb.asia-southeast1.firebasedatabase.app'});
const db = getDatabase();
const service = makeRoomService({db, getProfile: async uid => (await getFirestore().doc('players/' + uid).get()).data()});
const experienceService = makeExperienceService({db: getFirestore(), now: () => FieldValue.serverTimestamp()});
// Curriculum answers are packaged only with Functions. Online interaction
// proofs and teacher/student links must be issued by trusted server services.
const questService = makeQuestService({db: getFirestore()});
const options = {region: 'asia-southeast1', maxInstances: 4, timeoutSeconds: 30};
function callable(method) {
  return onCall(options, async request => {
    try {return await service[method](request.auth, request.data);}
    catch (error) {
      if (error instanceof RoomError) throw new HttpsError(error.code, error.message);
      throw new HttpsError('internal', 'Dịch vụ phòng chưa hoàn tất. Hãy thử lại.');
    }
  });
}
exports.createVillageRoom = callable('create');
exports.joinVillageRoom = callable('join');
exports.leaveVillageRoom = callable('leave');
exports.closeVillageRoom = callable('close');
function experienceCallable(method) {
  return onCall(options, async request => {
    try { return await experienceService[method](request.auth, request.data); }
    catch (error) {
      if (error instanceof ExperienceError) throw new HttpsError(error.code, error.message);
      throw new HttpsError('internal', 'Chưa xác nhận được EXP. Hãy thử lại cùng kết quả; không tạo yêu cầu thưởng mới.');
    }
  });
}
exports.claimVillageExperience = experienceCallable('claim');
exports.submitVillageLesson = experienceCallable('submitLesson');
function questCallable(method) {
  return onCall(options, async request => {
    try { return await questService[method](request.auth, request.data); }
    catch (error) {
      if (error instanceof QuestError) throw new HttpsError(error.code, error.message);
      throw new HttpsError('internal', 'Chưa xác nhận được nhiệm vụ. Tiến độ đã lưu được giữ nguyên; hãy thử lại.');
    }
  });
}
exports.getVillageQuestState = questCallable('state');
exports.assignVillageQuest = questCallable('assign');
exports.beginVillageQuest = questCallable('begin');
exports.collectVillageQuestItem = questCallable('collect');
exports.answerVillageQuest = questCallable('answer');
exports.reviewVillageQuest = questCallable('review');
exports.approveVillageQuestPractice = questCallable('approve');
exports.turnInVillageQuest = questCallable('turnIn');
exports.releaseVillageConnection = onValueDeleted({region: emulated ? 'us-central1' : options.region,
  instance: emulated ? projectId : 'viet-village-3d-default-rtdb',
  ref: '/rooms/{code}/members/{uid}/connections/{connectionId}'}, async event => {
  await service.prune(event.params.code);
  await db.ref(`presence/${event.params.code}/${event.params.uid}/${event.params.connectionId}`).remove();
});
