# Liên Việt Door — Bản nền nghiệp vụ theo phản hồi khách hàng

Ngày tiếp nhận: 22/10/2026.
Nguồn ưu tiên: `21.10-feedback-yeu-cau.docx`, Library ID `libfile_2af6727e4e9881918ddc578ae6a0b3a6`.

## Mục đích và thứ tự ưu tiên

Đây là bản ghi nhớ nghiệp vụ để đối chiếu trước khi viết prompt, thiết kế dữ liệu hoặc triển khai tiếp. Chưa phải đặc tả đã làm rõ toàn bộ và chưa phải prompt lập trình mới.

Ưu tiên: xác nhận mới nhất của người dùng/khách hàng → phản hồi thực tế trong tài liệu nguồn → quy trình Excel hiện có → đề xuất cũ của AI. Các đề xuất cũ khác yêu cầu mới phải được điều chỉnh, không coi là yêu cầu đã chốt.

Giữ định hướng: ERP Liên Việt Door, xưởng nội bộ và thuê ngoài, Next.js modular monolith, API cho CRUD chính, PostgreSQL, tài chính quản trị. Phạm vi mới có theo dõi hóa đơn và VAT dự kiến phục vụ quản trị; chưa mặc định triển khai kế toán Nợ/Có hoặc kê khai thuế.

## 1. Hai hệ giá trị

- Hợp đồng và từng dòng đơn giá cần hai cột: giá trị ký và giá trị quản trị/thực tế.
- Báo cáo phải chọn được cơ sở tương ứng; yêu cầu khách mô tả lãi lỗ theo giá thực tế và thuế theo hợp đồng ký.
- Giá quản trị chỉ giám đốc và cổ đông được xem; phải bảo vệ cả API, tổng hợp, xuất file và tài liệu, không chỉ ẩn cột UI.
- Ví dụ nguồn: 09C3 điểm O, HĐ ký 8,96 tỷ, giá gốc 6,70 tỷ. Không tự kết luận 6,70 tỷ là giá vốn, doanh thu quản trị hay tỷ lệ chiết khấu khi chưa xác nhận nghĩa của “giá gốc”.
- “Thuế theo HĐ ký” là mô tả nhu cầu của khách, chưa đủ để thiết kế công thức VAT pháp lý; cần làm rõ quan hệ giá ký, hóa đơn, thanh toán, chênh lệch và công nợ.

## 2. Cây đối tượng nhiều cấp

- Cây khách yêu cầu: Hợp đồng → Gói/Điểm → Hạng mục/Nhà → Ký hiệu cửa → Bộ.
- Mỗi cấp có thể gắn chi phí.
- Cho phép ghi chi phí chung ở cấp hợp đồng rồi phân bổ sau: quản lý, tiếp khách, mua sắm công cụ dụng cụ dùng chung.
- Cần tích hợp cây này với hồ sơ công trình đã đề xuất; chưa mặc định công trình = hợp đồng hoặc điểm = công trình.
- Chi phí gốc và phần phân bổ cần truy vết, tránh cộng trùng khi tổng hợp các cấp.

## 3. Gia công ngoài theo m² thành phẩm

- Lệnh lấy khối lượng từ danh mục ký hiệu cửa của hợp đồng, theo kích thước × số bộ.
- Có đơn giá gia công trọn gói theo m²; hỗ trợ phát sinh nhiều lần.
- So sánh khối lượng gia công với khối lượng hợp đồng theo từng ký hiệu; vượt phải cảnh báo để xác nhận.
- Có thao tác tạo đề xuất phát sinh/phụ lục với chủ đầu tư; cảnh báo không đồng nghĩa tự duyệt tăng hợp đồng.
- Hai hình thức: LVD cấp nhôm/vật tư và NCC lo trọn vật tư + gia công.
- Ví dụ: Sunglass 230.000đ/m²; phát sinh lần 2 nhà G 11,4 triệu; điểm A vượt 66,96m².

## 4. Công nợ NCC theo nhiều sổ

- Một NCC có nhiều tài khoản/sổ công nợ theo mục đích và điểm/hợp đồng; ví dụ nhân công điểm O, kính điểm O.
- Phân bổ nhiều–nhiều: một UNC trả nhiều đơn/dự án; một đơn nhận nhiều lần trả.
- Chênh lệch nhỏ cần lý do và người duyệt, không tự xóa.
- Đối tượng công nợ quản trị không đồng nghĩa tài khoản kế toán Nợ/Có.

## 5. Thanh toán đa nguồn và số dư trả trước

- Nguồn: tài khoản công ty, khoản vay, cá nhân trả hộ.
- Vay có thể giải ngân trả thẳng NCC; theo dõi dư nợ và lãi theo dự án.
- Cá nhân trả hộ sinh khoản phải hoàn ứng; cần bảo toàn người chi và nguồn thực tế.
- Nguồn nêu VCB cá nhân mặc định là thanh toán tiền mặt: giữ đây là yêu cầu cần làm rõ cách phân loại báo cáo; không làm mất dấu nguồn chuyển khoản cá nhân.
- Phân biệt tạm ứng theo đơn, đặt cọc giữ giá, tiền thừa NCC giữ/chuyển sang đơn sau.
- Theo dõi điều kiện ứng 50% và trả 50% trước khi nhận hàng nếu áp dụng.
- Gắn đơn hàng, đề nghị thanh toán, UNC, số giao dịch.
- Khách đưa hai phương án: chặn “đã trả” thiếu chứng từ hoặc cho “đã trả – thiếu UNC” kèm nhắc bổ sung. Chưa chọn thay khách; tách xác nhận giao dịch và độ đầy đủ chứng từ.

## 6. Hóa đơn là một luồng riêng

- Sổ hóa đơn đầu vào/đầu ra liên kết đơn mua/bán, theo dõi độc lập chi phí và tiền.
- Trạng thái: chưa có hóa đơn / có và khớp / có nhưng lệch, kèm lý do.
- Một đơn có thể có nhiều thuế suất theo dòng: ví dụ tấm AICA 8%, phụ kiện 10%.
- Có phụ phí, phiếu bán lẻ không hóa đơn và NCC còn nợ hóa đơn.
- Báo cáo chi phí không hóa đơn, NCC nợ hóa đơn và VAT dự kiến theo dự án để quản trị.
- Chênh lệch giữa mặt hàng trên hóa đơn và thực nhận phải được ghi nhận, đối chiếu; không sửa chứng từ gốc để ép khớp.
- Ví dụ nguồn: hóa đơn Sunglass gia công + kính điểm O còn khoảng 559 triệu cần cảnh báo.
- Cần làm rõ cơ sở phân bổ, VAT, ảnh hưởng lãi lỗ chia cổ đông; không tự xây công thức chia lợi nhuận/cổ phần từ thông tin hiện có.

## 7. Nhôm và kính có quy cách, đơn vị và trạng thái riêng

- Profile nhôm có kg/m theo mã.
- Nhập theo cây kèm chiều dài/quy cách cần thiết và kg thực cân; đối chiếu kg lý thuyết, hóa đơn, thực cân.
- Trạng thái “Tạm nhập theo hóa đơn – chờ phiếu”; chưa coi số tạm là đã xác nhận thực nhận.
- Nhôm thô có giá riêng; cần xử lý sổ đối chiếu NCC khác số nhập rời.
- Kính theo tấm/m² và từng nhà; việc đặt/sản xuất kính có thể đi trước gia công cửa.
- Theo dõi đã đặt / đã sản xuất / NCC đang giữ / đã giao / đã lắp; cần hỗ trợ thực hiện từng phần khi thiết kế chi tiết.
- Ghi nhận vỡ/hỏng khi NCC đang giữ, khiếu nại, trách nhiệm và bồi hoàn.

## 8. Giao thẳng công trình, ảnh chứng từ và Zalo

- Luồng điện thoại: chụp phiếu → chọn công trình → xác nhận số lượng thực nhận.
- Một phiếu có thể được chụp nhiều lần; chống trùng theo NCC + số phiếu, có xử lý trường hợp thiếu số hoặc số được tái sử dụng khi khảo sát.
- Phiếu hủy, hàng trả trực tiếp từ công trình và đổi trả phải theo dõi; không tự hiểu số âm là phiếu sai cần xóa.
- Lưu biên bản giao nhận và người công trường ký/xác nhận.
- Giao thẳng công trình ghi nhận nhập và xuất sử dụng/điều chuyển tương ứng theo nghiệp vụ được xác nhận, không tạo tồn kho tổng giả. Phải tránh mặc định mọi hàng giao đến công trình đều đã tiêu hao.
- Tài liệu nhấn mạnh đây có thể là tính năng tiết kiệm thời gian nhất; đưa vào ưu tiên khảo sát/triển khai thực địa.
- Có nguồn chứng từ từ Zalo không đồng nghĩa đã có yêu cầu tự tích hợp hoặc đọc tài khoản Zalo.

## 9. Chi phí hiện trường và chi phí chung

- Phiếu chi nhanh trên điện thoại kèm ảnh cho ăn ở, đi lại, siêu thị, thuốc, nước, bốc xếp và chi phí công trình xa.
- Cảnh báo nghi trùng: cùng số tiền trong khoảng ±3 ngày hoặc nội dung giống. Đây là cảnh báo để kiểm tra, không tự loại chứng từ.
- Phân bổ lương và chi phí chung theo tháng × dự án, theo ngày công hoặc tỷ lệ.
- Bảo lãnh: loại, số tiền, ngân hàng, hết hạn, phí và cảnh báo gia hạn.
- Hợp đồng khoán nhân công: tạm ứng → nghiệm thu khối lượng → quyết toán.
- Vận chuyển theo chuyến, phân bổ theo kg hoặc dự án.

## 10. Đối chiếu và chốt công nợ theo kỳ

- Nhập bảng đối chiếu của NCC từ Excel hoặc ảnh.
- Đối chiếu từng dòng, lưu lý do chênh lệch, in biên bản.
- Khóa số đã chốt; thay đổi sau chốt bằng chứng từ điều chỉnh được duyệt, giữ lịch sử.
- Từ “bút toán điều chỉnh” trong nguồn được hiểu trước mắt là chứng từ điều chỉnh quản trị, không tự mở rộng phạm vi kế toán đầy đủ.

## 11. Tính hợp lệ và chênh lệch chứng từ

- Đối chiếu tên pháp nhân và mã số thuế với danh mục công ty/NCC.
- Mọi phiếu nhập có SL theo chứng từ và SL thực nhận.
- Chênh lệch cần hướng xử lý: NCC bù, tính thêm hoặc trả lại.
- Lưu chứng từ gốc, bằng chứng và kết quả xử lý; không ghi đè gốc.

## Những giả định cũ phải sửa

1. Không coi một hợp đồng chỉ có một bộ giá trị.
2. Không dùng cây công trình/hạng mục đơn giản để thay cây nhiều tầng của khách.
3. Không coi mọi gia công ngoài đều do LVD cấp toàn bộ vật tư.
4. Không coi một NCC chỉ có một sổ công nợ hoặc một thanh toán chỉ thuộc một đơn.
5. Không bỏ theo dõi hóa đơn/VAT dự kiến ra khỏi phạm vi quản trị.
6. Không coi xuất vật tư/giao hàng ra công trình là toàn bộ đã tiêu hao.
7. Không lấy hồ sơ văn phòng làm luồng duy nhất; phải có giao nhận/chi nhanh bằng điện thoại và ảnh.
8. Không yêu cầu đã có đủ chứng từ mới ghi nhận mọi phát sinh; phải mô hình hóa tạm ghi nhận/chờ bổ sung, với quy tắc xác nhận được chốt riêng.

## Các điểm chưa chốt trước khi thiết kế chi tiết

- Nghĩa chính xác của giá ký, giá quản trị, “giá gốc”; quan hệ với giá vốn, công nợ và chia lãi cổ đông.
- Bản đồ quan hệ công trình với hợp đồng/gói/điểm/nhà; nhiều hợp đồng tại một điểm và các ngoại lệ.
- Thuế, hóa đơn và hai giá trị phải đối chiếu theo quy tắc nào; VAT dự kiến có điều kiện/giới hạn gì.
- Chọn chính sách giao dịch đã trả nhưng thiếu UNC; cá nhân trả hộ phân loại báo cáo thế nào.
- Ngưỡng và quyền duyệt vượt khối lượng, hao hụt, chênh lệch cân, xóa chênh công nợ.
- Phân bổ chi phí, khoản vay/lãi, đặt cọc, tiền thừa và đối chiếu/chốt kỳ theo cơ sở nào.
- Ảnh chỉ đính kèm hay cần OCR hỗ trợ nhập; không mặc định OCR tự xác nhận nội dung và không mặc định tích hợp Zalo.
- Thứ tự triển khai cần điều chỉnh theo giá trị thực tế, không tự coi ưu tiên Khách hàng/Báo giá cũ là lịch triển khai cuối cùng.

## Quy tắc dùng bản nền cho các prompt tiếp theo

- Đọc bản nền và nguồn liên quan trước khi viết prompt module.
- Chỉ rõ yêu cầu nguồn, phần đã chốt, đề xuất thiết kế và phần cần xác nhận.
- Không tự thêm tính năng xa nhu cầu để tạo cảm giác ERP lớn.
- Kiểm tra ảnh hưởng xuyên module; ví dụ hai giá trị và cây cấp bậc ảnh hưởng báo giá/hợp đồng ngay từ đầu, không đợi đến tài chính mới sửa.
- Các số tiền, NCC và tình huống nguồn là ví dụ thực tế để kiểm chứng luồng, không mặc định đưa thành seed data production.
- Khi có phản hồi tiếp theo, cập nhật bản nền có lịch sử; không âm thầm coi đề xuất AI thành quyết định khách hàng.

## Xác nhận ngày 22/10/2026 — ba loại hợp đồng

Người dùng xác nhận Liên Việt Door có ba biểu mẫu hợp đồng:

1. Hợp đồng thi công: mẫu trong bộ chứng từ hợp nhất. Khách là bên giao thầu, Liên Việt Door là bên nhận thầu.
2. Hợp đồng mua bán: file `2026_LVD_Hop_dong_kinh_te.xlsx`. Đối tác là bên bán, Liên Việt Door là bên mua. Kèm biên bản giao nhận kiêm phiếu xuất kho.
3. Hợp đồng theo mẫu khách hàng: dùng mẫu do khách đưa, không ép vào hai mẫu trên. Chưa có file mẫu nội bộ.

Chi tiết mẫu mua bán nằm ở `LVD-mau-hop-dong-mua-ban-2026.md`. Việc có ba loại không tự quyết định cây hợp đồng nhiều cấp hay hai cột giá.
