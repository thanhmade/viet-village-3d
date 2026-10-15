# Backend nhiệm vụ Tiếng Việt 1 – Học kì 1

Mã chạy: `firebase/functions/quest-service.cjs`, xuất callable trong `firebase/functions/index.cjs`.
Đáp án nằm tại `firebase/functions/private/tv1-hk1-v1.questions.teacher.json`; chỉ đóng gói cùng Functions, không phục vụ HTTP tĩnh hoặc Firebase Hosting.

## Phạm vi tin cậy

- Tài khoản phải được Firebase xác nhận nhà cung cấp `google.com`.
- Vai trò giáo viên/quản trị viên lấy từ custom claim `role` do hệ thống tin cậy cấp. Không đọc quyền từ hồ sơ hoặc tham số trình duyệt.
- Giáo viên còn cần quan hệ phụ trách học sinh tại `teacherStudentAccess/SHA256(teacherUid + ':' + studentUid)` với `teacherUid`, `studentUid`, `active:true`. Đây là dữ liệu chỉ máy chủ được ghi. Quản trị viên đã được cấp claim `admin` có quyền quản lý toàn hệ thống.
- Nhân vật online cần tồn tại tại `players/{uid}/characters/primary`, có `uid`, `characterId:'primary'`, `schemaVersion:1`, `created:true`. Backend không tự tin dữ liệu LV, EXP, túi đồ từ trình duyệt và không tự nhập tiến độ cục bộ.
- Chưa có dịch vụ vị trí multiplayer có thẩm quyền. Vì vậy bản Functions mặc định yêu cầu chứng nhận tương tác ở `questInteractionProofs/SHA256(questId + ':' + action + ':' + targetId)`. Dữ liệu gồm `uid`, `characterId`, `questId`, `mapId`, `action`, `targetId`, `producer:'authoritative-game-server'`, `validUntilMs`. Bước nhận, nhặt và trả nhiệm vụ bị từ chối nếu thiếu chứng nhận hợp lệ. Client Rules không cho tạo hoặc đọc chứng nhận này.
- Máy chủ game tương lai chỉ được phát chứng nhận sau khi đối chiếu vị trí do máy chủ kiểm soát với `run.spawn` hoặc vị trí NPC. Tọa độ do trình duyệt gửi không đủ để xác nhận an toàn online.

## API

Mỗi payload có `characterId:'primary'`. Các trường ngoài hợp đồng bị từ chối.

| Callable | Phương thức | Tham số bổ sung |
|---|---|---|
| getVillageQuestState | state | Không |
| assignVillageQuest | assign | studentUid, questId, questionId, mode |
| beginVillageQuest | begin | questId, questionId, mode, npcId; tùy chọn assignmentId, repeat |
| collectVillageQuestItem | collect | questId, pointId |
| answerVillageQuest | answer | questId, answer |
| reviewVillageQuest | review | studentUid, questId; chỉ giáo viên phụ trách |
| approveVillageQuestPractice | approve | studentUid, questId, practiceScores; questionScores khi bài có rubric |
| turnInVillageQuest | turnIn | questId, npcId |

`mode` chính thức là `classroom` hoặc `adventure`; cả hai cần bài được giáo viên giao. Lớp học bỏ điều kiện LV và nhiệm vụ trước. Phiêu lưu kiểm tra cả hai trên tiến độ máy chủ. Bài đang làm giữ nguyên câu hỏi, seed và điểm nhặt; không đổi mức giữa lượt. Sau hoàn thành có thể nhận lại với `repeat:true` để ôn tập.

`answer` sử dụng ID lựa chọn, ID chữ ghép hoặc ID cặp ghép, không tách/chuyển dấu tiếng Việt. Máy chủ chấm bốn dạng xác định: single_choice, multi_select, order_tokens, match_pairs. oral_response và performance không tự chấm; giáo viên đánh giá đủ rubric. Tất cả bài còn cần đánh giá thực hành chung theo từng tiêu chí.

Trạng thái lượt: `accepted → collected → practice_pending → ready_to_turn_in → completed`. Câu sai vẫn giữ bước `collected`. Lượt đã thu thập chỉ có một thẻ nhiệm vụ riêng, không chiếm hoặc ghi đè túi đồ/trang bị hiện có. Thẻ được tiêu thụ tại lúc trả nhiệm vụ.

## EXP và giao dịch nguyên tử

Backend sử dụng `shared/experience-core.js` và bảng EXP đang chạy, không tạo hệ thống cấp thứ hai. Bảng từ gói mới được giữ dưới dạng đề xuất riêng; chưa chuyển đổi hoặc hạ cấp nhân vật hiện có.

Biên nhận: `experienceReceipts/SHA256('quest:first-clear:' + canonicalQuestId)`. Khóa không chứa độ khó, phiên bản gói hoặc số lượt. Các thay đổi phiên bản, đổi mức và ôn tập không tạo quyền nhận EXP mới. `progression/experience`, biên nhận và trạng thái trả nhiệm vụ được ghi trong cùng Firestore transaction. Retry, hai tab và nhiều yêu cầu đồng thời chỉ có một lần cộng thưởng. Không thay đổi tài liệu nhân vật, túi đồ, trang bị hoặc nhiệm vụ cũ.

## Chế độ cục bộ và giới hạn hiện tại

Factory cho phép truyền `db` giao dịch, `verifyInteraction` và `allowLocalPreview:true` để thử trên localhost. `mode:'preview'` chỉ mở khi chính máy chủ được cấu hình như vậy; không có trên callable production. Preview có thể nhận/tìm thẻ/làm bài, nhưng `rewardEligible:false`, không phát EXP và không tự phê duyệt thực hành. Local bridge không phải hệ thống đồng bộ tiến độ chính thức. Khi có bài được giáo viên giao hợp lệ, backend có cơ chế nâng lượt preview đang làm thành lượt chính thức, giữ seed, điểm nhặt và đáp án đã làm.

Chưa triển khai Functions, chưa áp dụng Rules, chưa cấp vai trò giáo viên, chưa nhập hồ sơ cục bộ lên máy chủ, chưa có dịch vụ chứng nhận vị trí. Không bật onlineConfig hoặc tự triển khai trong lượt tích hợp này.

Trên Firebase Hosting khi `onlineConfig.enabled = false`, client dùng chế độ **luyện tập** (`SOURCE-CODE/js/learning-practice.js`): chấm câu chọn/ghép/xếp trong trình duyệt bằng `LEARNING/TV1-HK1/practice-keys.json` (băm có salt, vẫn dò được), lưu riêng theo UID, không gọi dịch vụ này, không ghi receipt hay EXP và không xác nhận thực hành. Kết quả luyện tập không phải bằng chứng hoàn thành.

## Kiểm thử

- Unit: `node --test SOURCE-CODE/tests/quest-backend.test.cjs`.
- Emulator: `node scripts/firebase-local.mjs test`; chỉ dùng `demo-viet-village-3d`, Auth/Firestore/RTDB/Functions trên loopback. Script từ chối chạy ngoài worktree CAP-NHAT/nhánh cap-nhat.
- Unit có fixture vị trí giả để kiểm tra thuật toán, không đưa vào dữ liệu MAP. Vị trí thật được bộ nhập lấy từ overlay đã kiểm tra điều hướng.
- Emulator có tài khoản thử do bộ kiểm thử tạo và chứng nhận tương tác được fixture Admin ghi. Đây không phải kiểm chứng đăng nhập Google thật, quyền giáo viên thật hay vị trí multiplayer thật.
- Bộ kiểm tra bao gồm 435 lượt theo mọi phiên bản, 87 biên nhận khung nhiệm vụ, Bài 33 đúng/sai, thực hành bắt buộc, chống giả quyền, cấp thấp trong lớp học, cổng LV/tiền nhiệm phiêu lưu, tải lại/seed ổn định, giới hạn cấp, lỗi commit/retry và sáu yêu cầu nhận thưởng đồng thời.
