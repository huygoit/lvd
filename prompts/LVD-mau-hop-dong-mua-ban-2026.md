# Liên Việt Door — Mẫu hợp đồng mua bán

Ngày nạp: 22/10/2026.
Nguồn: `g:\My Drive\workspace\LienVietDoor\tai-lieu-chung\2026_LVD_Hop_dong_kinh_te.xlsx`.
Xác nhận cùng ngày của người dùng: Liên Việt Door có ba loại biểu mẫu hợp đồng, gồm thi công, mua bán, và mẫu khách hàng đưa. File này là loại mua bán. Loại thi công nằm trong bộ chứng từ hợp nhất. Loại theo mẫu khách hàng chưa có file nội bộ.

Các dòng đối tác trong sheet `Info` là hồ sơ thật để đối chiếu mẫu, không đưa vào dữ liệu chạy thử.

## Vai trò các bên

Liên Việt Door là bên mua, ghi sẵn là bên B. Đối tác là bên bán, ghi là bên A. Câu mở đầu trên mẫu: bên bán đồng ý bán, bên mua đồng ý mua, ví dụ hàng trên mẫu là thép không gỉ inox.

Thông tin bên mua ghi trên mẫu: Công ty TNHH Liên Việt Door, địa chỉ 7 Phước Hòa 2, Phường Cẩm Lệ, TP Đà Nẵng, mã số thuế 0401511308, điện thoại 0236.399 0979, email lienvietdoor.co@gmail.com, tài khoản VietinBank chi nhánh Bắc Đà Nẵng, đại diện ông Trần Quang Dũng, giám đốc. Số điện thoại này khác số 0945.698.468 trên bộ chứng từ thi công. Chưa gộp hai số thành một quy tắc.

## Sheet Info

Mỗi đối tác một dòng, từ dòng 11. Cột: số hợp đồng, tên công ty, địa chỉ, mã số thuế, điện thoại, email, số tài khoản, ngân hàng, người đại diện, chức vụ, hình thức thanh toán, theo báo giá số, ngày hợp đồng, số tiền theo hợp đồng.

Số tiền trên mẫu là giá đã gồm VAT, một con số, không tách trước thuế trên dòng hợp đồng. Cột “theo báo giá số” có trong bảng nhưng các dòng mẫu đang để trống.

Số in: `{số hợp đồng}.HDKT`. Ô chọn đối tác là chỉ số dòng trong danh sách, không phải mã khách của bộ chứng từ thi công.

## Hợp đồng (`HDKT`)

Căn cứ Bộ luật Dân sự thông qua ngày 24/11/2015 và Luật Thương mại thông qua ngày 14/06/2005.

- Điều 1: nội dung hàng hóa. Giá trị đã gồm VAT. Chủng loại, số lượng và đơn giá theo báo giá đính kèm. Có ô đọc số tiền bằng chữ.
- Điều 2: giao một lần trong vòng 5 ngày kể từ ngày ký, giao tại kho bên bán. Bên mua cử người kiểm tra, nhận hàng, xuống hàng và ký biên bản giao hàng ngay khi nhận đủ.
- Điều 3: bên mua thanh toán theo điều khoản thanh toán và chịu phạt trả chậm theo lãi suất tiền vay của Ngân hàng Công thương Việt Nam tại thời điểm trả chậm. Mẫu đang có một ô “mức ước tính” 20.000.000 đồng/tháng. Coi đây là chữ trên file, chưa chốt là định mức cho mọi hợp đồng. Bên bán đảm bảo số lượng, quy cách, xuất xứ và chất lượng.
- Điều 4: hình thức lấy từ Info. Thời hạn trên mẫu là thanh toán 100% ngay sau khi nhận đủ hàng và chứng từ kèm theo.
- Điều 5: hợp đồng thanh lý khi bên bán giao hết hàng, cấp đủ hóa đơn bán hàng hợp lệ và bên mua trả đủ. Sửa đổi phải bằng văn bản. Tranh chấp không thỏa thuận được thì phán quyết tại Trung tâm trọng tài kinh tế Hà Nội, chi phí do bên có lỗi chịu. Hợp đồng có hiệu lực từ ngày ký, 2 trang, 2 bản.

Chữ ký: đại diện bên mua và đại diện bên bán. Dòng chức danh in dưới bên bán là giám đốc.

## Biên bản giao nhận kiêm phiếu xuất kho (`BBGNHH`)

Số in: `{số hợp đồng}.BBGN`. Cùng hai bên với hợp đồng. Bảng hàng có cột tên hàng, đơn vị tính, số lượng, đơn giá, thành tiền, rồi tổng, thuế VAT và thành tiền sau thuế.

Năm dòng ghế trên sheet là số gõ sẵn để canh bản in, không phải danh mục hàng của Liên Việt Door và không khớp câu “thép không gỉ inox” ở hợp đồng. Khi làm phần mềm, bảng này phải lấy từ báo giá hoặc phiếu giao, không chép các dòng ghế.

Lời xác nhận: hai bên đối chiếu thống nhất số lượng, chất lượng, quy cách lô hàng. Lập 2 bản, mỗi bên giữ 1 bản.

## Chưa có trong file này

Hợp đồng theo mẫu khách hàng không có điều khoản nội bộ. Mẫu của khách là gốc, Liên Việt Door chỉ cần biết đó là một loại riêng, không ép vào mẫu thi công hay mẫu mua bán.
