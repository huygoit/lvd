# PROMPT TRIỂN KHAI PHÂN HỆ CÔNG TRÌNH VÀ HỢP ĐỒNG — LIÊN VIỆT DOOR

## 1. Nhiệm vụ

Bạn là Senior Business Analyst, Product Designer và Next.js Developer. Hãy phân tích codebase rồi thiết kế và triển khai phân hệ Công trình và Hợp đồng cho ERP Liên Việt Door.

Mục tiêu: tạo một nơi làm việc thống nhất để người dùng biết công trình nào đang thực hiện, phạm vi hợp đồng gồm những gì, các điểm/nhà có những ký hiệu cửa nào, phát sinh nào cần xử lý, mốc nào sắp đến hạn và hồ sơ nào còn thiếu.

Yêu cầu sản phẩm: dễ học, thao tác ngắn, nhập một lần dùng lại, thể hiện đúng thực tế, quản lý được hồ sơ nhỏ và hợp đồng nhiều điểm/nhà. Không biến màn hình thành một bảng dữ liệu quá rộng hoặc một form dài bắt người dùng nhập hết ngay từ đầu.

## 2. Tài liệu gốc và thứ tự ưu tiên

Đối chiếu các tài liệu được cung cấp trong dự án:

1. Phản hồi mới nhất của người dùng/khách hàng.
2. `21.10-feedback-yeu-cau.docx`.
3. `LVD-baseline-nghiep-vu-2026-10-22.md` — bản tổng hợp phản hồi, không thay thế nguồn gốc khi có điểm khác nhau.
4. Bộ chứng từ Excel `2026 BO CHUNG TU LVD HOP NHAT.xlsx`.
5. Các prompt và phương án kiến trúc trước đây, chỉ dùng khi không trái yêu cầu mới.

Không coi dữ liệu minh họa trong Excel hoặc đề xuất cũ của AI là quyết định nghiệp vụ của khách hàng. Nếu tài liệu không có trong codebase, sử dụng nội dung đã được cung cấp, chỉ rõ phần thiếu; không tự bịa nội dung nguồn.

Các quy tắc nguồn đã xác định:

- Hợp đồng và từng dòng có hai hệ giá trị: giá ký và giá quản trị.
- Giá quản trị chỉ giám đốc và cổ đông được xem theo quyền được cấp.
- Cây quản lý: Hợp đồng → Gói/Điểm → Hạng mục/Nhà → Ký hiệu cửa → Bộ.
- Chi phí có thể ghi tại từng cấp hoặc ghi chung cấp hợp đồng rồi phân bổ sau.
- Gia công ngoài đối chiếu khối lượng theo ký hiệu cửa; vượt phải cảnh báo và có luồng đề xuất phát sinh/phụ lục.
- Có hình thức LVD cấp vật tư và hình thức NCC lo cả vật tư + gia công.
- Hóa đơn, chi phí và thanh toán là các luồng khác nhau cần liên kết.
- Hỗ trợ tác nghiệp hiện trường, chứng từ ảnh, thiếu hồ sơ chờ bổ sung và thực hiện từng phần.
- Chốt số phải giữ lịch sử; điều chỉnh sau chốt có quyền và phê duyệt.

## 3. Kiểm tra codebase và kiến trúc

Kiểm tra Next.js/React/TypeScript, Router, ORM, migrations, database, auth, permission registry, layout, navigation, design system, API client, query/cache, upload, xuất tài liệu và module Khách hàng/Báo giá/Công trình đã có.

- Next.js modular monolith, frontend/backend cùng dự án.
- PostgreSQL theo kiến trúc đã thống nhất, tái sử dụng ORM/convention hiện có.
- Dữ liệu và CRUD chính qua API nội bộ, không dùng Server Actions cho các luồng chính.
- Route Handler xử lý HTTP, auth và validation; service giữ nghiệp vụ; repository đọc/ghi dữ liệu.
- Module giao tiếp qua public service/read interface phù hợp, không ghi tùy tiện vào bảng nội bộ của nhau.
- Không thay authentication, design system hoặc xây lại module Khách hàng/Báo giá nếu đã tồn tại.
- Giao dịch nhiều bảng cần transaction; trạng thái và số tiền được kiểm tra tại server.

## 4. Ranh giới triển khai

### Triển khai đầy đủ trong phân hệ này

- Hồ sơ công trình và phân công phụ trách.
- Hợp đồng với khách hàng/chủ đầu tư/tổng thầu.
- Cây phạm vi, danh mục ký hiệu cửa và số bộ.
- Hai hệ giá trị với phân quyền riêng.
- Phiên bản dự thảo, duyệt nội bộ, ghi nhận ký và hiệu lực.
- Phụ lục/đề xuất phát sinh, tăng giảm phạm vi, giá trị và thời gian.
- Mốc tiến độ, lịch thanh toán theo điều khoản.
- Quản lý bảo lãnh thuộc hợp đồng.
- Hồ sơ thiết kế ở mức lưu phiên bản/phê duyệt phát hành, chưa bóc tách vật tư.
- Nghiệm thu khối lượng và quyết toán hợp đồng với khách hàng.
- Hồ sơ, nhật ký, cảnh báo, tìm kiếm và báo cáo trong phạm vi.
- Giao diện tiếp nhận/tổng hợp từ mua hàng, kho, gia công, thi công, tài chính, hóa đơn và bảo hành khi các module đó tồn tại.

### Trách nhiệm các phân hệ liên quan

| Nghiệp vụ | Chủ sở hữu | Công trình/Hợp đồng cần làm |
|---|---|---|
| Báo giá | Quotations | Chọn đúng phiên bản đã chấp thuận, tạo dự thảo hợp đồng có nguồn truy vết |
| Bóc tách vật tư | Engineering | Cấp mã phạm vi/ký hiệu, liên kết phiên bản thiết kế, hiển thị trạng thái |
| Mua hàng/kho/giao thẳng | Procurement/Inventory | Cấp điểm/nhà/địa điểm giao, người nhận và chiều phân bổ; nhận số liệu tổng hợp |
| Gia công nội bộ/thuê ngoài | Fabrication | Cấp khối lượng được phép theo ký hiệu, nhận số liệu đã giao việc/thực nhận và đề xuất vượt |
| Thi công, giao nhận | Installation | Cấp phạm vi/mốc kế hoạch, nhận tiến độ và bằng chứng thực hiện |
| Nhân công khoán | Labor/Fabrication theo kiến trúc | Liên kết hợp đồng khoán và khối lượng, không trộn với hợp đồng khách hàng |
| Chi phí, thu chi, công nợ | Finance | Cấp đối tượng tập hợp chi phí, lịch thanh toán, nghiệm thu; hiển thị dữ liệu được phép xem |
| Hóa đơn/VAT dự kiến | Finance/Invoices | Đối chiếu giá trị và tình trạng hồ sơ; không tự phát hành hóa đơn điện tử |
| Bảo hành | Warranty | Bàn giao phạm vi, thời hạn và hồ sơ; không tạo hệ thống ticket trùng lặp |

Nếu module phụ thuộc chưa có, triển khai đúng phần sở hữu của module này và contract tích hợp cần thiết; ẩn thao tác chưa khả dụng hoặc ghi “Chưa có dữ liệu từ phân hệ…”. Không tạo số 0 giả, API giả production hoặc cả phân hệ tài chính chỉ để lấp tab.

## 5. Các điểm cần xác nhận, không được tự kết luận

1. “Giá quản trị/giá thực tế/giá gốc” là cơ sở giá bán nội bộ nào; không mặc định đó là giá vốn. Ví dụ 8,96 tỷ và 6,70 tỷ chưa đủ để suy ra lợi nhuận.
2. Cách quy chiếu Công trình với Hợp đồng/Gói/Điểm/Nhà, có hợp đồng bao trùm nhiều công trình độc lập hay không.
3. Cơ sở công nợ và lịch thu: giá ký hay giá quản trị; cách xử lý phần chênh lệch.
4. Cách tính thuế, giữ lại bảo hành, thu hồi tạm ứng, phạt/khấu trừ và quyết toán thực tế theo điều khoản.
5. Người duyệt, số cấp duyệt và điều kiện cho phép triển khai trước khi có hợp đồng/phụ lục ký.

Tiếp tục làm các phần độc lập với các câu trả lời này. Với phần bị phụ thuộc, ghi rõ “Chưa xác nhận cơ sở”, lưu được bản nháp, chưa phát sinh tự động công nợ/lợi nhuận/thuế. Không lấy mặc định kỹ thuật thay cho quyết định nghiệp vụ.

## 6. Quan hệ dữ liệu và cây phạm vi

Đề xuất ban đầu cần đối chiếu dữ liệu thực tế:

- Khách hàng có nhiều công trình.
- Một công trình có nhiều hợp đồng khách hàng.
- Mỗi hợp đồng có cây: Gói/Điểm → Hạng mục/Nhà → Ký hiệu cửa → Bộ.
- Công trình đã tạo lúc báo giá phải được dùng lại, không tạo hồ sơ mới khi ký hợp đồng.
- Điểm/nhà có tên, mã và địa điểm riêng khi cần; không tự coi “Điểm” là một “Công trình” khác.

Mặc định đề xuất một hợp đồng thuộc một công trình. Nếu khảo sát xác nhận hợp đồng bao trùm nhiều công trình, cần chốt mô hình liên kết trước khi khóa schema; không âm thầm nhân bản hợp đồng để vượt giới hạn.

Mỗi nút phạm vi có ID ổn định, loại, mã, tên, cha, trạng thái sử dụng, thứ tự. Mã ký hiệu có thể trùng tên ở hai nhà khác nhau nhưng không được mất ngữ cảnh. Chặn cây vòng, gắn sai hợp đồng hoặc tham chiếu chéo khách hàng không hợp lệ.

UI cho phép ẩn cấp trung gian không cần dùng. Không bắt hợp đồng nhà dân một cửa phải tạo bốn thư mục rỗng; việc bỏ cấp phải là quy tắc hệ thống rõ ràng, vẫn truy vết được phạm vi.

Chuyển/đổi tên nút đã có chứng từ phải giữ tham chiếu và lịch sử. Chuyển phạm vi thương mại sau khi ký phải đi qua điều chỉnh được kiểm soát.

## 7. Nguyên tắc trải nghiệm người dùng

- Tạo nhanh, bổ sung dần; chỉ bắt buộc dữ liệu khi đến hành động cần dùng.
- Cung cấp mặc định hợp lý, lấy lại khách hàng/công trình/liên hệ từ nguồn.
- Hiển thị mã kèm tên, cho tìm theo cách người dùng gọi thực tế như “Điểm O”, “Nhà G”, “Cửa D01”.
- Nút chính thể hiện bước tiếp theo: “Lưu nháp”, “Gửi duyệt”, “Ghi nhận đã ký”, “Tạo phát sinh”.
- Tách lỗi chặn thao tác với cảnh báo cần kiểm tra; giải thích ngắn cách xử lý.
- Dữ liệu chưa xác định hiển thị “Chưa có/Chưa xác nhận”, không dùng 0 để thay thế.
- Cho phép quay lại danh sách giữ bộ lọc/vị trí cuộn nếu khả thi.
- Form có thay đổi chưa lưu phải cảnh báo khi rời; save/loading/error rõ ràng.
- Không yêu cầu nhập lại số tiền/tổng hợp hệ thống đã biết.
- Không tự gửi thông báo ra email/Zalo chỉ vì có nút ghi nhận hoặc upload ảnh.
- Nội dung tiếng Việt, VND và ngày theo vi-VN; ngày nghiệp vụ theo Asia/Ho_Chi_Minh.

Kế thừa Home: menu ngang, không sidebar toàn ứng dụng, navy–xanh dương gradient, nền sáng, card trắng. Cây phạm vi là panel làm việc trong chi tiết hợp đồng, không thay menu ngang bằng sidebar cố định.

## 8. Danh sách Công trình

Hiển thị mặc định: mã/tên, khách hàng, địa điểm ngắn, người phụ trách, giai đoạn thực hiện, mốc sắp tới, cảnh báo và cập nhật gần nhất.

- Tìm theo mã, tên, khách hàng, điểm/nhà có liên quan.
- Lọc người phụ trách, tình trạng, thời gian, công trình quá hạn hoặc thiếu hồ sơ.
- Phân trang/sắp xếp phía server.
- Chế độ bảng desktop; card mobile ưu tiên tên, giai đoạn, mốc và liên hệ.
- Bộ lọc nhanh: “Tôi phụ trách”, “Đang thực hiện”, “Cần xử lý”.
- Giá trị tài chính chỉ hiển thị khi có quyền; không nhồi mọi tổng tiền vào danh sách mặc định.

## 9. Tạo và sửa Công trình

Tạo nhanh với: tên, khách hàng, người phụ trách. Mã tự sinh; địa điểm và liên hệ được bổ sung trước lúc lập kế hoạch giao/lắp cần thông tin đó.

Thông tin mở rộng:

- Tên gọi khác, địa chỉ và ghi chú đường vào/giao hàng.
- Vai trò các bên: khách hàng giao dịch, chủ đầu tư, tổng thầu, tư vấn giám sát khi có; chọn từ danh mục/liên hệ sẵn có, không tạo khách hàng trùng chỉ vì thêm vai trò.
- Chỉ huy công trường/người nhận, điện thoại, liên hệ chính.
- Người kinh doanh, kỹ thuật, quản lý công trình và thành viên được giao.
- Ngày dự kiến bắt đầu/kết thúc, ngày thực tế.
- Hồ sơ khảo sát, ảnh hiện trường, ghi chú.

Cho phép thêm liên hệ nhanh, nhập thông tin sau; không bắt có hợp đồng mới được tạo công trình.

## 10. Không gian làm việc của một Công trình

Đầu trang: mã/tên, khách hàng, người phụ trách, tình trạng, hạn chính và nút thao tác theo quyền.

Tab chính gọn:

1. **Tổng quan:** mốc tiếp theo, việc cần xử lý, các hợp đồng và tiến độ có nguồn.
2. **Hợp đồng & Phạm vi:** danh sách hợp đồng, cây phạm vi của hợp đồng đang chọn.
3. **Kế hoạch & Thực hiện:** mốc và tổng hợp gia công/giao/lắp/nghiệm thu theo khả dụng.
4. **Hồ sơ:** bản vẽ, hợp đồng ký, biên bản, ảnh và phiên bản.
5. **Tài chính:** chỉ khi có quyền và nguồn dữ liệu, tách cơ sở giá rõ ràng.
6. **Nhật ký:** thay đổi quan trọng và trao đổi nội bộ gắn bản ghi.

Phụ lục, bảo lãnh và lịch thanh toán nằm trong ngữ cảnh hợp đồng; không tạo hàng chục tab ngang ở cấp công trình. Có thể dùng subtab, accordion hoặc menu “Thêm”.

## 11. Danh sách và tạo Hợp đồng

Danh sách toàn hệ thống hoặc trong công trình: mã nội bộ, số hợp đồng ký, công trình, đối tác, tình trạng duyệt/ký, thời hạn và giá trị theo quyền.

Tạo bằng một trong ba cách:

- Từ phiên bản báo giá khách đã chấp thuận: chép nội dung thành dự thảo, giữ nguồn từng dòng khi có.
- Nhập thủ công cho hợp đồng không qua báo giá trong hệ thống.
- Nhập hợp đồng đang thực hiện từ hồ sơ cũ, có luồng kiểm tra riêng.

Trình tự tạo dễ dùng:

1. Chọn công trình, đối tác và nguồn báo giá.
2. Nhập phạm vi/đơn giá.
3. Nhập thời gian, thanh toán, bảo hành và điều khoản.
4. Kiểm tra, lưu nháp hoặc gửi duyệt.

Cho phép lưu nháp giữa các bước. Không yêu cầu đi hết wizard mới lưu được công việc.

Mã nội bộ duy nhất toàn hệ thống; số hợp đồng đối tác được kiểm tra theo ngữ cảnh phù hợp, không mặc định duy nhất toàn cầu. Chặn double submit và mã trùng bằng cơ chế database an toàn.

## 12. Dữ liệu Hợp đồng

- Mã, số ký, tên/nội dung, công trình và đối tác giao dịch.
- Người đại diện, chức vụ, căn cứ ủy quyền nếu có; snapshot thông tin hai bên.
- Nguồn báo giá và đúng phiên bản được chọn.
- Ngày lập, ngày ký, ngày có hiệu lực, điều kiện hiệu lực nếu có.
- Cơ sở giá: trọn gói, đơn giá cố định hoặc cách khác được doanh nghiệp xác nhận; trường này quyết định điều kiện điều chỉnh/quyết toán, không áp công thức đơn giá cho mọi hợp đồng.
- Phạm vi cung cấp, gia công, lắp đặt, phần bao gồm/loại trừ.
- Thời hạn và điều kiện bắt đầu; lịch dự kiến và mốc hợp đồng.
- Các đợt thanh toán, thời hạn phản hồi/thanh toán, điều kiện hồ sơ.
- Giữ lại bảo hành, thu hồi tạm ứng, phạt/khấu trừ nếu có: nhập điều khoản, cơ sở và mức theo thỏa thuận; không tự áp chính sách pháp lý.
- Bảo hành: thời hạn, phạm vi, điều kiện bắt đầu.
- Trách nhiệm các bên và ghi chú thỏa thuận.
- Người phụ trách, người duyệt, hồ sơ ký và tài liệu liên quan.

Thiếu dữ liệu được phân loại: thiếu để lưu nháp, thiếu để duyệt, thiếu để ghi nhận hiệu lực. Bảng kiểm trước thao tác phải chỉ ra trường/hồ sơ cần bổ sung và liên kết tới đúng chỗ.

## 13. Hai hệ giá và bảo mật dữ liệu quản trị

Mỗi dòng đơn giá có:

- Đơn giá ký, giá trị ký trước thuế và phần thuế tương ứng theo dữ liệu được xác nhận.
- Đơn giá quản trị, giá trị quản trị và cơ sở tính được xác nhận riêng.
- Trạng thái đã xác nhận/chưa xác nhận cơ sở; giá trị chưa có không tự sao chép từ giá ký.

Khối lượng hợp đồng ban đầu có thể dùng chung cho hai hệ giá; nếu thực tế cần khối lượng quản trị khác, phải làm rõ trước khi triển khai, không tự tạo hai bộ khối lượng độc lập.

Không coi “giá quản trị” là “giá vốn”. Không tính lợi nhuận bằng giá ký trừ giá quản trị. Không tự dùng tỷ lệ 6,70/8,96 để suy diễn toàn bộ đơn giá.

Nếu có tổng hợp đồng gốc nhưng chưa có chi tiết, lưu số kiểm soát do người dùng xác nhận, phân biệt tổng khai báo và tổng dòng. Có cảnh báo chênh; không tạo dòng “điều chỉnh cho khớp” âm thầm.

Quyền quản trị áp dụng tại server cho từng trường và mọi đầu ra: API, tìm kiếm, tổng hợp, tooltip, biểu đồ, PDF/Word/Excel, lịch sử, phiên bản, file đính kèm và cache. Người không có quyền không được sửa/ghi đè các trường này qua payload. Không xuất bản báo cáo có thể suy ra giá quản trị từ tổng/chênh lệch.

Tài liệu gửi bên ngoài mặc định dùng danh sách trường thương mại được phép xuất; không lấy cả object nội bộ rồi ẩn vài cột bằng template. Bản quản trị có quyền riêng, nhãn “Nội bộ”, không làm mẫu phát hành mặc định.

## 14. Ký hiệu cửa, số bộ và khối lượng hợp đồng

Mỗi ký hiệu thuộc nhà/hạng mục và điểm tương ứng:

- Mã/tên, vị trí, loại cửa/cấu kiện, quy cách.
- Chiều rộng/cao/dài, đơn vị kích thước rõ ràng.
- Số bộ, đơn vị tính giá, diện tích/chiều dài tính giá.
- Đơn giá hai hệ theo quyền, thuế theo dòng nếu áp dụng.
- Liên kết bản vẽ/phiên bản, ghi chú, trạng thái phạm vi.

Tách khối lượng vật lý với khối lượng thương mại nếu có quy tắc tối thiểu/làm tròn được xác nhận. Không dùng diện tích tính tiền đã làm tròn làm kích thước sản xuất.

Ví dụ quy đổi hình học chuẩn: rộng mm × cao mm / 1.000.000 = m² một bộ; nhân số bộ để có tổng diện tích. Các quy tắc khác phải được cấu hình/chốt rõ.

“Bộ” là cấp theo dõi thực tế. Cho quản lý số lượng gộp khi các bộ giống nhau và chưa cần định danh; có thể tách mã từng bộ/vị trí khi cần giao/lắp/nghiệm thu riêng. Tổng số bộ đã tách và chưa tách phải khớp, không nhân đôi khối lượng.

Kích thước/khối lượng/đơn giá dùng decimal; cách làm tròn phải thống nhất với báo giá và chứng từ, server tính lại. Một hợp đồng có thể có thuế suất khác nhau theo dòng, không nhân một thuế suất mặc định lên toàn hợp đồng khi dữ liệu khác nhau.

## 15. Giao diện cây và nhập nhanh

- Cây điểm/nhà bên trong workspace; panel nội dung hiển thị danh sách ký hiệu của phạm vi đang chọn.
- Tìm nhanh ký hiệu, breadcrumb rõ hợp đồng/điểm/nhà.
- Thêm điểm/nhà, sao chép cấu trúc từ mẫu hoặc từ nhà khác với xem trước.
- Paste nhiều dòng từ Excel và import có ánh xạ cột, kiểm tra, xem trước, báo dòng lỗi.
- Cho nhập tổng hợp trước và hoàn thiện chi tiết sau, nhưng chỉ phần đã kiểm tra/phê duyệt mới làm chuẩn giao việc.
- Tổng bộ, m² và giá trị hiển thị theo đúng đơn vị; không cộng m² với mét dài hoặc bộ thành một số “tổng khối lượng”.
- Khối lượng/giá trị ở cấp cha là tổng hợp con hoặc khoản riêng được đánh dấu; không cộng cả cha và con hai lần.
- Mobile dùng drill-down/breadcrumb, không ép cây và bảng rộng cạnh nhau.

## 16. Duyệt nội bộ, ký và hiệu lực

Tách các chiều:

- Duyệt nội bộ: Nháp → Chờ duyệt → Đã duyệt; có Yêu cầu chỉnh sửa và Rút về nháp theo quyền.
- Ký: Chưa ký / Đã ký, có ngày, người ghi nhận, tài liệu và bằng chứng.
- Hiệu lực: Chưa có hiệu lực / Có hiệu lực / Tạm ngừng / Chấm dứt theo điều kiện và quyết định thực tế.
- Thực hiện: Chưa triển khai / Đang thực hiện / Đã hoàn thành phạm vi / Đã quyết toán / Đã thanh lý theo hồ sơ liên quan.

Không coi nội bộ duyệt là đối tác đã ký. Không coi ngày ký luôn bằng ngày hiệu lực. Không ép mọi chiều thành một enum vừa trộn ký, thi công và công nợ.

Đề xuất một cấp duyệt ban đầu nếu chưa có workflow, xác nhận người có quyền; không hard-code tên người/vai trò. Chính sách tự duyệt của người lập chưa được khách chốt, phải theo cấu hình xác nhận, không kế thừa mặc định cũ thành yêu cầu khách.

Bản đã ký/hiệu lực phải giữ nguyên nội dung đã chốt; thay đổi thương mại qua phụ lục/điều chỉnh có lịch sử. Thông tin hành chính được phép sửa phải phân loại, không sửa ngày/giá trị/phạm vi đã ký bằng form chung.

Hồ sơ scan thiếu trang có thể ghi nhận thực trạng ký và đánh dấu thiếu hồ sơ nếu chính sách cho phép; việc cho triển khai phải là quyền/quyết định riêng có lý do, không tự kích hoạt từ checkbox “đã ký”.

## 17. Phiên bản và hợp đồng đang thực hiện nhập từ ngoài

- Có bản nháp nhiều lần sửa và bản chốt rõ ràng; lưu nguồn, người, thời điểm, lý do.
- Nhập hồ sơ đang thực hiện cần ngày bắt đầu theo dõi, giá trị/khối lượng lũy kế trước hệ thống, tài liệu xác nhận và người duyệt.
- Phân biệt số dư/lũy kế chuyển vào với phát sinh mới; không tạo phiếu thu, hóa đơn hoặc nghiệm thu giả để dựng lịch sử.
- Chưa có lũy kế xác nhận thì báo “Chưa đủ dữ liệu lịch sử”, không kết luận đã thu/đã làm bằng 0.
- Lũy kế chuyển vào thuộc module chuyên môn được xác nhận và đối chiếu, module hợp đồng chỉ giữ nguồn tham chiếu phù hợp.

## 18. Phát sinh và phụ lục

Phát sinh có thể đến từ thay đổi thiết kế, khách yêu cầu thêm/bớt, đổi quy cách/giá, kéo dài tiến độ hoặc cảnh báo vượt khối lượng từ gia công/thi công.

Đề xuất phát sinh lưu: hợp đồng, điểm/nhà/ký hiệu, nguồn phát hiện, nội dung cũ/mới, chênh lệch lượng/giá/thời gian, lý do, bằng chứng, người lập và người xử lý.

Luồng đề xuất: Nháp → Chờ duyệt nội bộ → Chờ đối tác xác nhận → Được chấp thuận / Bị từ chối / Hủy. Có thể lập phụ lục từ một hoặc nhiều đề xuất cùng hợp đồng.

Phụ lục có số, ngày ký/hiệu lực, trạng thái, hồ sơ và các dòng điều chỉnh. Chênh lệch có thể tăng hoặc giảm; số âm trong dòng điều chỉnh hợp lệ không bị validator dùng cho báo giá chặn vô điều kiện.

Giá trị/khối lượng hiện hành = bản gốc + các điều chỉnh có hiệu lực, theo đúng ngày/phạm vi. Đề xuất hoặc nội bộ duyệt chưa tự tăng quyền khối lượng. Không cộng trùng cả đề xuất và phụ lục chứa đề xuất đó.

Nếu doanh nghiệp cho phép làm trước khi đối tác ký, ghi “Chấp thuận triển khai nội bộ” riêng, có người duyệt, giới hạn và lý do. Chưa được coi là tăng giá trị hợp đồng hoặc công nợ khách hàng đã chấp nhận.

Sửa giảm khối lượng dưới mức đã thực hiện/nghiệm thu phải chặn hoặc chuyển luồng xử lý chênh lệch được duyệt; không làm mất lịch sử.

## 19. Kiểm soát khối lượng xuyên module

Theo từng hợp đồng/điểm/nhà/ký hiệu và đơn vị:

- Khối lượng gốc.
- Phát sinh đã có hiệu lực.
- Khối lượng hợp đồng hiện hành.
- Khối lượng đã giao gia công còn hiệu lực.
- Đã nhận thành phẩm.
- Đã giao công trình/đã lắp nếu có nguồn.
- Đã nghiệm thu với khách hàng.
- Phần còn lại và phần vượt ở từng bước.

Mỗi cột có định nghĩa, nguồn và thời điểm cập nhật; không cộng các giai đoạn này thành “tổng khối lượng đã làm”.

Ví dụ kiểm tra: hợp đồng cho 100m², đã giao gia công 60m², thêm lệnh 50m² thì phát hiện vượt 10m² ở bước giao việc, dù chưa nhận thành phẩm. Lệnh hủy một phần chỉ giải phóng phần được hủy hợp lệ.

Làm lại do lỗi/thay thế hàng vỡ cần loại công việc riêng, liên kết bộ gốc; không tự tăng khối lượng thương mại hoặc tự trừ nghiệm thu cũ.

Nhận sự kiện/đề nghị từ module gia công để mở sẵn “Tạo đề xuất phát sinh” với đúng phạm vi. Kiểm tra đồng thời trong transaction hoặc cơ chế giữ khối lượng phù hợp để hai lệnh cùng lúc không vượt mà đều được báo hợp lệ.

Không tự tính một tỷ lệ hoàn thành từ số thứ tự giai đoạn. Có thể hiển thị nhiều tỷ lệ riêng theo m²/bộ và nguồn xác định; không trung bình tỷ lệ khác đơn vị tùy tiện.

## 20. Kế hoạch và hồ sơ thiết kế

Mốc: khảo sát, chốt kích thước/bản vẽ, vật tư, gia công, giao/lắp, nghiệm thu, quyết toán và mốc khác theo hợp đồng.

- Mốc gắn hợp đồng hoặc phạm vi con, người phụ trách, kế hoạch, thực tế, bằng chứng.
- Điều kiện như “45 ngày từ khi nhận đủ tạm ứng và chốt bản vẽ” được lưu cả văn bản và trigger có nguồn, chưa đủ điều kiện thì chưa tự chốt ngày bắt đầu.
- Điều chỉnh lịch nội bộ không tự sửa hạn cam kết hợp đồng.
- Không ép mọi điểm/nhà tuần tự; kính có thể đã đặt cho 9 nhà trong khi gia công cửa mới 4 nhà.

Bản vẽ lưu số hiệu, phiên bản, ngày, phạm vi, người kiểm tra, trạng thái duyệt/phát hành. Giữ bản cũ và đánh dấu thay thế, không xóa tệp đã gắn lệnh.

Tách “đã duyệt nội bộ” với “đối tác xác nhận” nếu có. Lệnh sản xuất về sau tham chiếu đúng phiên bản phát hành. Thay bản vẽ có cảnh báo công việc đang dùng bản cũ và có thể tạo đề xuất phát sinh; không tự sửa hàng loạt lệnh cũ.

## 21. Lịch thanh toán, tạm ứng và giữ lại

Hỗ trợ nhiều đợt thay vì cố định bốn đợt như mẫu Excel:

- Tên/loại đợt, số tiền hoặc tỷ lệ.
- Cơ sở tính đã xác nhận: giá trị hợp đồng ban đầu, hiện hành, nghiệm thu hoặc cơ sở khác có định nghĩa.
- Trước/sau thuế, hệ giá dùng, điều kiện hồ sơ, sự kiện kích hoạt.
- Ngày đến hạn cố định hoặc số ngày sau sự kiện; lịch/ngày làm việc theo cấu hình được xác nhận.
- Thu hồi tạm ứng, giữ lại bảo hành và khấu trừ có bảng tính minh bạch khi áp dụng.

Chỉ kiểm tổng tỷ lệ 100% khi các đợt cùng chia một cơ sở thanh toán duy nhất. Không cộng phần giữ lại, thu hồi ứng hoặc đợt theo khối lượng như các tỷ lệ độc lập để ép 100%.

Phân biệt kế hoạch thu, khoản đủ điều kiện đề nghị, đề nghị đã phát hành, khoản phải thu xác nhận, tiền thực thu và tiền đã phân bổ. Không tự ghi nhận “đã thu” từ trạng thái hợp đồng hoặc nút in đề nghị.

Tiền thực thu/cấn trừ/hoàn tiền lấy từ Finance; hỗ trợ mô hình phân bổ nhiều–nhiều theo khả năng module. Thiếu chứng từ là trạng thái riêng của Finance, không được tự chặn/xác nhận bằng chính sách chưa chốt.

Phụ lục thay đổi giá trị không tự sửa lịch thanh toán đã xác nhận hoặc khoản đã thu; tạo đề nghị điều chỉnh, hiển thị ảnh hưởng và giữ số cũ.

## 22. Bảo lãnh và bảo hành

Bảo lãnh gắn hợp đồng: loại, bên phát hành/thụ hưởng, ngân hàng, số chứng thư, số tiền, ngày hiệu lực/hết hạn, phí, tài liệu và trạng thái. Theo dõi gia hạn, thay thế, giải tỏa và cảnh báo trước hạn theo cấu hình.

Tiền bảo lãnh không mặc định là khoản đã chi hay chi phí; phí và ký quỹ liên kết Finance theo loại nghiệp vụ.

Bảo hành hợp đồng có thời hạn, điều kiện bắt đầu, giá trị giữ lại nếu có. Khi nghiệm thu từng phần, cho xác định phạm vi/ngày bắt đầu theo biên bản; không mặc định mọi nhà cùng bắt đầu một ngày.

Module này bàn giao thông tin cho Warranty. Yêu cầu giải phóng tiền giữ lại phải đối chiếu điều kiện, hồ sơ và số đã thanh toán; không tự trả tiền khi hết hạn.

## 23. Nghiệm thu khối lượng và quyết toán

Phân biệt xác nhận nội bộ/nhận hàng xưởng với nghiệm thu khách hàng. Một trạng thái giao hàng không tự làm tăng khối lượng nghiệm thu thương mại.

Nghiệm thu từng đợt:

- Hợp đồng, điểm/nhà, ký hiệu và khối lượng đợt này.
- Lũy kế trước, đợt này, lũy kế sau.
- Ngày, đại diện các bên, tình trạng ký, bằng chứng và tồn tại cần khắc phục.
- Đơn giá, nguồn hợp đồng/phụ lục; vượt cơ sở được duyệt thì cảnh báo/chuyển phát sinh.
- Bản nháp khác bản đã ký; không ghi lũy kế chính thức hai lần vì cập nhật trạng thái.

Quyết toán:

- Tập hợp khối lượng được xác nhận theo loại hợp đồng và điều khoản.
- Thể hiện gốc, phụ lục, khối lượng/giá trị quyết toán, thuế theo dòng khi có, khấu trừ và cơ sở từng khoản.
- Đối chiếu tiền đã ứng/thu được Finance phân bổ, giữ lại, còn đề nghị và hồ sơ hóa đơn.
- Không dùng công thức “khối lượng × giá” cho hợp đồng trọn gói khi điều khoản không cho phép.
- Không trừ cùng một khoản tạm ứng hai lần giữa nghiệm thu, quyết toán và công nợ.
- Chốt quyết toán lưu snapshot; sửa sau chốt bằng phiên bản/điều chỉnh có duyệt.
- Thanh lý là hồ sơ riêng; cho ghi nhận điều kiện còn lại, không mặc định thanh lý = không còn công nợ/bảo hành.

## 24. Chi phí, hóa đơn và tổng hợp tài chính

Cho các module gắn chi phí với bất kỳ cấp phạm vi hợp lệ nào. Chi phí chung hợp đồng được ghi ở cấp hợp đồng rồi phân bổ sau. Một giao dịch chi phí có một nguồn, các dòng phân bổ phải đối chiếu được; không tạo chi phí thứ hai chỉ để xuất hiện dưới nhà/ký hiệu.

Tổng hợp trong tab tài chính theo quyền:

- Giá trị gốc/phát sinh/hiện hành, nghiệm thu và quyết toán theo hệ giá được chọn rõ ràng.
- Ngân sách, chi phí đã phát sinh, cam kết còn lại và chi phí chung chưa phân bổ nếu module cung cấp.
- Thu, còn phải thu theo cơ sở đã xác nhận, giữ lại, các khoản chưa đối chiếu.
- Hóa đơn đầu ra/đầu vào liên quan, khớp/lệch/chưa có và lý do; NCC nợ hóa đơn theo nguồn Finance/Invoices.
- Vay/lãi phân bổ, trả hộ/chờ hoàn ứng, cọc giữ giá, tiền thừa NCC là dữ liệu liên kết, không tự suy từ giá trị hợp đồng.

Không tính lợi nhuận hoặc VAT dự kiến khi chưa xác nhận cơ sở. Báo thiếu dữ liệu/chưa đối chiếu thay vì đưa ra con số chắc chắn. Không triển khai kê khai thuế hoặc sổ kế toán Nợ/Có trong module này.

Hàng đã đến công trình không mặc định đã sử dụng; hợp đồng chỉ đọc số nhập/đang giữ/đã dùng theo module vật tư. Không tạo nhập kho tổng giả cho hàng giao thẳng.

## 25. Hồ sơ, biểu mẫu và phát hành tài liệu

Nhóm hồ sơ: hợp đồng/phụ lục ký, báo giá nguồn, bản vẽ, đề xuất phát sinh, giao nhận, nghiệm thu, quyết toán/thanh lý, bảo lãnh/bảo hành và hồ sơ thanh toán liên quan.

- Phân loại, phạm vi gắn, ngày/số, phiên bản, người upload, thiếu/đủ và hạn bổ sung.
- Upload nhiều ảnh trên điện thoại; không mặc định OCR hoặc tích hợp Zalo.
- Giữ tệp gốc, không thay bằng ảnh nén không đọc được.
- Quyền xem/tải theo loại hồ sơ và mức nhạy cảm; không coi ai xem hợp đồng cũng xem được mọi file quản trị.
- Có checklist theo giai đoạn, không bắt đủ hồ sơ cuối công trình ngay lúc tạo nháp.

Biểu mẫu dự kiến: hợp đồng, phụ lục, đề xuất phát sinh, nghiệm thu, quyết toán/thanh lý, đề nghị tạm ứng/thanh toán/quyết toán, bàn giao/bảo hành.

Ưu tiên dùng mẫu Word có biến cho văn bản và xuất PDF; bảng chi tiết có thể xuất Excel khi cần. Đây là định hướng triển khai cần đối chiếu mẫu hiện có, không tự thay toàn bộ mẫu của doanh nghiệp.

Tính tiền ở service; mẫu chỉ trình bày dữ liệu. Lưu phiên bản template, snapshot dữ liệu và file phát hành. Tài liệu nháp có watermark, bản ký lưu riêng với bản hệ thống sinh. Không giả chữ ký/con dấu.

Không xây trình soạn mẫu kéo thả hoặc tự soạn điều khoản pháp lý mới trong phạm vi này. Trường mẫu thiếu phải báo lỗi có tên biến, không âm thầm để trống nội dung quan trọng.

## 26. Trạng thái công trình và đóng hồ sơ

Đề xuất các giai đoạn tổng quan: Chuẩn bị kinh doanh / Chuẩn bị thực hiện / Đang thực hiện / Hoàn thành phạm vi / Theo dõi sau bàn giao / Đóng hồ sơ; có Tạm dừng và Không triển khai kèm lý do.

Đây là đề xuất hiển thị cần ánh xạ với quy trình thật, không suy ra tự động từ hợp đồng đầu tiên nếu còn hợp đồng/hạng mục khác đang làm.

Tách hoàn thành kỹ thuật, quyết toán, thanh lý, tất toán công nợ và kết thúc bảo hành. Cho xem checklist còn vướng khi đề nghị đóng hồ sơ. Ngoại lệ đóng khi còn việc phải có quyền, lý do và danh sách tồn đọng tiếp tục theo dõi.

Hồ sơ đã chốt không hard delete. Hủy/chấm dứt lưu lý do và xử lý nghĩa vụ còn lại; không tự xóa đơn mua, lệnh gia công hoặc tiền đã phát sinh.

## 27. Vai trò, phạm vi truy cập và nhật ký

Vai trò sử dụng dự kiến: kinh doanh, quản lý công trình, kỹ thuật, công trường, tài chính, lãnh đạo/cổ đông và quản trị hệ thống.

Quyền theo hành động và phạm vi công trình, không chỉ theo màn hình: xem/tạo/sửa, quản lý thành viên, nhập cây, duyệt, ghi nhận ký/hiệu lực, cho triển khai ngoại lệ, duyệt phát sinh, nghiệm thu, chốt quyết toán, đóng/mở lại và xuất tài liệu.

Quyền xem/sửa giá quản trị tách riêng và chỉ cấp đúng giám đốc/cổ đông được ủy quyền. Quản trị kỹ thuật/người quản lý user không mặc định được xem giá quản trị. Không để người dùng tự nâng quyền mình qua phân công dự án.

Nhật ký các thay đổi quan trọng có người, thời điểm, nguồn, lý do và trước/sau theo quyền xem. Audit chứa dữ liệu giá quản trị cũng phải được lọc, không dùng audit để vượt phân quyền.

## 28. Tìm kiếm, cảnh báo và Dashboard

Cảnh báo có nguồn rõ, người xử lý, hạn, mức độ và link tới đúng hành động:

- Hợp đồng/phiên bản chờ duyệt, thiếu bản ký hoặc chưa đủ điều kiện triển khai.
- Phạm vi chưa hoàn thiện, tổng dòng lệch tổng kiểm soát.
- Bản vẽ thay đổi ảnh hưởng lệnh đang thực hiện.
- Gia công/thực hiện vượt khối lượng, phát sinh chưa được đối tác xác nhận.
- Mốc chậm, nghiệm thu/quyết toán chờ xử lý.
- Đợt thanh toán đến hạn theo nguồn đã xác nhận.
- Bảo lãnh sắp hết hạn, bảo hành/tiền giữ lại cần xem xét.
- Thiếu hóa đơn/chứng từ theo dữ liệu module liên quan.

Không đếm trùng một vấn đề ở nhiều nơi thành nhiều việc độc lập. Cảnh báo cần phân biệt “Đã xử lý” với “Tạm ẩn/Đã xem”.

Dashboard dùng dữ liệu quyền hạn thực: công trình đang thực hiện, hợp đồng ký mới, phát sinh chờ duyệt, mốc quá hạn và nghĩa vụ đến hạn. Chỉ số có kỳ phát sinh hay mốc chốt rõ; báo cáo lịch sử không lấy số hiện tại gắn nhãn quá khứ.

## 29. Import và export

- Import Excel vào bản nháp có template/ánh xạ cột, preview, kiểm tra đơn vị, phạm vi cha, trùng mã, decimal và hai hệ giá.
- Báo lỗi theo dòng, cho tải danh sách lỗi; không ghi nửa chừng mà không thông báo.
- Có khóa đợt import/định danh nguồn để chống nhập lại; retry không tạo trùng.
- Người thiếu quyền không được nhập/xuất giá quản trị qua cột ẩn hoặc tên cột khác.
- Xuất báo cáo theo công trình/hợp đồng/điểm/nhà và cơ sở giá được phép.
- Một công trình có nhiều hợp đồng không được cộng trùng cây và giá trị nguồn.

## 30. Gợi ý mô hình dữ liệu

Tái sử dụng đối tượng đang có; các tên dưới chỉ là trách nhiệm dữ liệu, không bắt buộc tạo bảng riêng cho mọi tên:

Project, ProjectParticipant, ProjectContact; Contract, ContractRevision; ScopeNode, DoorScheduleItem, PhysicalUnit; ContractLine, ContractPriceBasis; ChangeRequest, ContractAmendment, AmendmentLine; Milestone; PaymentSchedule, PaymentCondition; Guarantee; DrawingRevision; CustomerAcceptance, AcceptanceLine; ContractSettlement, SettlementLine; DocumentIssue, Attachment, AuditEvent.

Phân biệt danh tính ổn định, bản dữ liệu đã chốt và phiên bản điều chỉnh. Không buộc triển khai event sourcing hoặc microservices để đáp ứng yêu cầu này.

Các bảng tiền/khối lượng dùng kiểu chính xác; dữ liệu chưa có khác 0. Foreign key, unique constraint và transaction bảo vệ tính nhất quán. Có optimistic concurrency để phát hiện hai người sửa cùng bản nháp.

## 31. API và tích hợp

Endpoint minh họa, điều chỉnh theo convention:

```text
GET/POST  /api/projects
GET/PATCH /api/projects/{id}
GET/POST  /api/contracts
GET/PATCH /api/contracts/{id}
GET/POST  /api/contracts/{id}/scope
POST      /api/contracts/{id}/submit
POST      /api/contracts/{id}/approve
POST      /api/contracts/{id}/record-signing
GET/POST  /api/contracts/{id}/changes
GET/POST  /api/contracts/{id}/amendments
GET/POST  /api/contracts/{id}/milestones
GET/POST  /api/contracts/{id}/payment-schedule
GET/POST  /api/contracts/{id}/guarantees
GET/POST  /api/contracts/{id}/acceptances
GET/POST  /api/contracts/{id}/settlements
GET       /api/contracts/{id}/quantity-summary
```

Các hành động chốt/hiệu lực/hủy/điều chỉnh cần command riêng và validation tại server. Không cho PATCH tùy ý trạng thái/giá trị đã chốt. Check quyền cả quan hệ lồng nhau để không truy cập hợp đồng khác bằng đổi ID.

Tích hợp trả về nguồn, thời điểm cập nhật, đơn vị và trạng thái khả dụng. Dữ liệu tài chính không cache chung giữa người dùng; query key/cache phải tôn trọng quyền và bộ lọc. Khi dependency lỗi, phần còn lại vẫn hoạt động, không đổi lỗi thành số 0.

## 32. Tình huống nghiệm thu bắt buộc

1. Nhà dân nhỏ: tạo công trình, một hợp đồng, một ký hiệu, vài bộ mà không phải tạo hàng loạt cấp rỗng.
2. Hợp đồng nhiều điểm: điểm O/A, nhiều nhà, cùng ký hiệu D01 ở hai nhà; tìm/giao việc đúng ngữ cảnh.
3. Từ báo giá chấp thuận tạo đúng một dự thảo hợp đồng, giữ phiên bản nguồn; retry không tạo trùng.
4. Giá ký 8,96 tỷ, giá quản trị 6,70 tỷ: chỉ người có quyền xem được hệ quản trị; không tự coi chênh lệch là lợi nhuận.
5. Kiểm tra rò giá quản trị qua API, export, file, lịch sử, aggregate và quyền chỉnh payload.
6. Tổng hợp đồng nhập trước chưa có chi tiết: lưu được nháp, cảnh báo lệch, không tự thêm dòng bù.
7. Khối lượng 100m², đã giao gia công 60, lệnh thêm 50: cảnh báo vượt 10; hai lệnh đồng thời vẫn được kiểm tra đúng.
8. Làm lại do lỗi hoặc kính vỡ: liên kết bộ gốc, không tăng khối lượng hợp đồng tự động.
9. Phát sinh lần hai nhà G, tăng/giảm và phụ lục chỉ cập nhật khối lượng hiện hành đúng một lần khi có hiệu lực.
10. Giảm phạm vi dưới khối lượng đã nghiệm thu: phát hiện và yêu cầu xử lý, không xóa lịch sử.
11. Một phần đã lắp/nghiệm thu, phần khác còn ở xưởng: hiển thị đồng thời và không cộng trùng các giai đoạn.
12. Thời hạn theo điều kiện: chưa nhận đủ ứng/chưa chốt bản vẽ thì chưa giả định ngày bắt đầu.
13. Lịch thanh toán có tạm ứng, thu hồi ứng, giữ lại: không ép tỷ lệ sai và không trừ tiền ứng hai lần.
14. Phụ lục đổi giá trị không ghi đè đợt thu hoặc tiền thực thu trước đó.
15. Quyết toán/chốt kỳ: thay đổi sau chốt đi qua điều chỉnh, báo cáo giữ được số đã xác nhận.
16. Bảo lãnh hết hạn, phí/ký quỹ và bảo hành từng phần: không nhầm thành tiền đã chi hoặc cùng một hạn.
17. Nhập hồ sơ đang thực hiện: phân biệt lũy kế trước hệ thống, số chưa biết và phát sinh mới.
18. Chi phí chung cấp hợp đồng phân bổ xuống nhà không nhân đôi tổng chi phí.
19. Hóa đơn nhiều thuế suất/thiếu/lệch: hiển thị đúng nguồn và lý do; không tự sửa chứng từ gốc.
20. Chốt thi công không tự tất toán công nợ hay kết thúc bảo hành.
21. Hai người sửa bản nháp đồng thời: có thông báo xung đột, không mất dữ liệu âm thầm.
22. Mobile 375/430px, tablet và desktop: tạo nhanh, tìm cây, tải ảnh, xem mốc và lỗi form đều dùng được.
23. Module kho/tài chính chưa có hoặc lỗi: tab phụ thuộc xử lý rõ, công trình/hợp đồng vẫn dùng được.
24. Typecheck, lint, build và kiểm tra nghiệp vụ phù hợp chạy theo scripts thực tế, báo đúng phần chưa chạy được.

## 33. Trình tự triển khai và bàn giao

1. Đọc nguồn, phân tích codebase; lập bảng ngắn yêu cầu đã rõ / giả định đề xuất / điểm cần xác nhận.
2. Chốt các quyết định ảnh hưởng schema và tiền; tiếp tục phần độc lập, không tự chốt thay khách.
3. Triển khai hồ sơ công trình và workspace dễ dùng.
4. Triển khai hợp đồng, cây phạm vi, hai hệ giá và phân quyền ngay từ nền tảng.
5. Thêm duyệt/ký/hiệu lực, phát sinh/phụ lục và kiểm soát khối lượng.
6. Thêm mốc, lịch thanh toán, bảo lãnh, hồ sơ, nghiệm thu/quyết toán và báo cáo.
7. Nối module đã có qua interface; phần chưa có ghi đúng giới hạn, không mock production.
8. Kiểm tra bằng tình huống thực tế nêu trên, sửa lỗi và báo kết quả.

Không dừng ở bản mô tả hoặc giao diện tĩnh khi nhiệm vụ được giao là triển khai. Không triển khai mua hàng, kế toán hoặc hệ thống khác ngoài ranh giới chỉ để hoàn thiện giao diện.

Bàn giao: chức năng hoạt động, migrations/cấu hình cần áp dụng, quyền cần cấp, API đã nối/chưa nối, mẫu tài liệu, kết quả kiểm tra và các quyết định nghiệp vụ còn chờ xác nhận. Mô tả rõ giới hạn; không gọi một tab tổng hợp chưa có dữ liệu là đã hoàn thành cả phân hệ liên quan.
