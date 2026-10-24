# Liên Việt Door — Bộ chứng từ hợp nhất 2026

Ngày nạp: 22/10/2026.
Nguồn: `g:\My Drive\workspace\LienVietDoor\tai-lieu-chung\2026 BO CHUNG TU LVD HOP NHAT.xlsx`.
Vai trò: ghi lại cách văn phòng đang lập chứng từ trên Excel. Đây là nguồn vận hành hiện có, đứng sau xác nhận mới của khách trong `LVD-baseline-nghiep-vu-2026-10-22.md`. Không coi file này là quyết định thay bản nền, và không đem các dòng mẫu vào dữ liệu thật.

## Cách file vận hành

Một hồ sơ là một dòng trên sheet `Info`, tối đa 200 dòng từ dòng 5. Khóa liên kết mọi sheet là **Mã hợp đồng** (cột L), không được đổi sau khi đã phát sinh dòng. Mã khách (cột B) dùng để lọc và in.

Ô vàng là nhập. Ô xám là công thức, không ghi đè. Chọn mã hợp đồng ở `Info!C2` rồi in. Các sheet in không nhập thêm.

Dòng mẫu KH001–KH004 là giả định. KH005 ghi là hồ sơ Amaxco để đối chiếu hóa đơn số 36. Hướng dẫn trong file yêu cầu xóa hoặc ghi đè khi dùng thật.

## Quy trình in theo giai đoạn

1. Báo giá: mỗi hạng mục một dòng trên sheet `Báo giá`, gắn mã hợp đồng. In ở `In báo giá`. Số in dạng `BG-{mã khách}/LVD`.
2. Hợp đồng: nhập khách và điều khoản trên `Info`. In `Hợp đồng kinh tế`.
3. Tạm ứng: mỗi lần thu một dòng ở `Chi tiết tạm ứng, thanh toán`, loại `Tạm ứng`. In `Đề nghị tạm ứng`.
4. Mua vật tư: mỗi dòng hàng một dòng ở `Nhập vật tư`, gắn mã hợp đồng. Cộng thành tổng giá thành.
5. Nghiệm thu: ngày và người ký trên `Info`. In `Biên bản nghiệm thu bàn giao`. Bảng hạng mục lấy từ báo giá. Ô trống thì bản in chừa dấu chấm để viết tay.
6. Quyết toán: khối lượng thực tế trên `Chi tiết Giá trị quyết toán`, cách nhập giống báo giá. In `Quyết toán, thanh lý HĐ`, `In chi tiết quyết toán`, `Đề nghị quyết toán`.
7. Hóa đơn và thu tiền: số, ký hiệu, ngày hóa đơn trên `Info`. Mỗi lần thu thêm một dòng loại `Thanh toán`. In `Đề nghị thanh toán`.

## Hồ sơ khách và hợp đồng (`Info`)

Nhập: mã khách, tên, địa chỉ, mã số thuế hoặc CCCD, điện thoại, email, số tài khoản, ngân hàng, người đại diện, chức vụ, mã hợp đồng, ngày hợp đồng, giá trị trước thuế, một thuế suất cho cả hợp đồng, nội dung, thời hạn thi công, địa điểm, thông số kỹ thuật riêng, số ngày được trả chậm, bảo hành theo tháng, số và ký hiệu và ngày hóa đơn, ngày nghiệm thu, người ký nghiệm thu bên Liên Việt Door, tỷ lệ và điều kiện tối đa 4 đợt, hình thức thanh toán, điều kiện tạm ứng, ngày báo giá, người báo giá, số ngày hiệu lực, người ký nghiệm thu thêm của hai bên.

Tự tính: VAT = làm tròn đồng của giá trước thuế nhân thuế suất. Giá sau thuế = trước thuế + VAT. Tiền từng đợt = giá sau thuế nhân tỷ lệ. Đợt cuối lấy phần còn lại để tổng khớp. Tổng tỷ lệ phải bằng 100%. Loại khách = `KH lẻ` khi thuế suất 0%, ngược lại `KHDN`.

Thuế suất 0% làm mọi bản in ẩn hóa đơn GTGT, VAT và thành tiền sau thuế. Cột mã số thuế lúc đó là số CCCD và nhãn in đổi thành “CCCD số”.

Tạm ứng và thanh toán thực tế cộng từ sổ chi tiết theo mã hợp đồng và loại. Tỷ lệ trên `Info` chỉ là điều khoản hợp đồng, không phải số đã thu.

Tổng giá thành = cộng thành tiền sau thuế của `Nhập vật tư` theo mã hợp đồng. Lợi nhuận tạm tính = giá hợp đồng sau thuế trừ tổng giá thành. Đây là công thức của file Excel, chưa phải mô hình hai giá trị trong bản nền.

Giá trị quyết toán = cộng thành tiền trước thuế của sheet quyết toán, rồi cộng VAT theo thuế suất hợp đồng.

## Dòng báo giá và quyết toán

Cột nhập: nội dung, đơn vị tính, rộng mm, cao mm, số bộ, đơn giá cửa, đơn giá phụ kiện, ghi chú, mã hợp đồng.

Thành tiền trước thuế, làm tròn đồng:

- Có cả rộng và cao lớn hơn 0: `((rộng/1000 × cao/1000 × đơn giá cửa) + đơn giá phụ kiện) × số bộ`.
- Thiếu rộng hoặc cao: `(đơn giá cửa + đơn giá phụ kiện) × số bộ`.

Phụ kiện luôn cộng theo bộ, không nhân với diện tích. Không có cách tính theo mét dài. Không có chiết khấu từng dòng. Thuế không nằm trên dòng báo giá.

Khóa dòng in là `mã hợp đồng|số thứ tự trong hợp đồng`.

## Nhập vật tư

Mỗi dòng hàng: mã và tên nhà cung cấp, nội dung, số lượng, đơn giá, thuế suất riêng của dòng, số hóa đơn, ngày hóa đơn, mã hợp đồng nhận chi phí.

Thành tiền trước thuế = số lượng × đơn giá. VAT = thành tiền trước thuế × thuế suất dòng. Sau thuế = trước thuế + VAT. Cột tổng theo số hóa đơn chỉ hiện ở dòng đầu của cùng nhà cung cấp và cùng số hóa đơn.

Chi phí này là chi phí đầu vào gắn hợp đồng, không phải phiếu kho nhiều trạng thái của bản nền.

## Sổ tạm ứng và thanh toán

Mỗi lần tiền về một dòng: mã hợp đồng, loại `Tạm ứng` hoặc `Thanh toán`, ngày, số tiền, ghi chú. Lũy kế đã thu theo hợp đồng. Còn phải thu = giá sau thuế trừ lũy kế đã thu.

## Bên B trên mọi chứng từ (`Công ty`)

Công ty TNHH Liên Việt Door. Đại diện ông Trần Quang Dũng, giám đốc. Địa chỉ 07 Phước Hòa 2, P. Cẩm Lệ, TP. Đà Nẵng. Điện thoại 0945.698.468. Email lienvietdoor.co@gmail.com. Mã số thuế 0401511308. Lĩnh vực: cung cấp, thi công lắp đặt, hoàn thiện cửa cuốn, chống cháy, inox, nhôm kính, cửa nhựa.

Có hai tài khoản. Mọi chứng từ hiện tài khoản 1, Vietinbank chi nhánh Bắc Đà Nẵng. Đề nghị tạm ứng và đề nghị quyết toán của khách lẻ hiện tài khoản 2, LPBank. Số tài khoản nằm trong file nguồn, không chép vào seed.

## Bộ chứng từ chỉ để in

- Hợp đồng kinh tế trong file này là mẫu thi công: bên A là bên giao thầu, bên B là Liên Việt Door bên nhận thầu. Căn cứ Bộ luật Dân sự 91/2015/QH13, Luật Thương mại 36/2005/QH11, và nhu cầu hai bên. Tối đa 4 đợt. Số tiền bằng chữ lấy từ sheet ẩn `_DocSo`, dạng “đồng chẵn”. Đây không phải mẫu hợp đồng duy nhất. Mẫu mua bán và mẫu khách hàng ghi ở `LVD-mau-hop-dong-mua-ban-2026.md`.
- Biên bản nghiệm thu bàn giao.
- Quyết toán và thanh lý hợp đồng.
- Đề nghị tạm ứng, đề nghị thanh toán, đề nghị quyết toán.
- In báo giá, vùng in từ dòng 3. Đầu trang là tên công ty, địa chỉ, mã số thuế, điện thoại, email. Bên phải ghi “Đà Nẵng, ngày … tháng … năm …”, lấy ngày báo giá, không có thì lấy ngày hợp đồng. Tiêu đề `BẢNG BÁO GIÁ`, số `BG-{mã khách}/LVD`. Lời dẫn: kính gửi tên khách, địa chỉ, rồi câu xin gửi báo giá theo nội dung và địa điểm trên Info.
- Bảng in có đủ cột: STT, nội dung, đơn vị tính, rộng mm, cao mm, số bộ, đơn giá cửa, đơn giá phụ kiện, thành tiền trước thuế, ghi chú. Dòng hàng chỉ hiện thành tiền trước thuế.
- Khách lẻ, tức thuế suất 0%: một dòng `TỔNG CỘNG` bằng tổng trước thuế. Không in thuế và không in thành tiền sau thuế. Câu đọc số là “Bằng chữ”.
- Khách doanh nghiệp: `Cộng tiền hàng (trước thuế)`, rồi `Thuế giá trị gia tăng (n%)` làm tròn đồng trên tổng trước thuế, rồi `TỔNG CỘNG (đã gồm thuế)`. Câu đọc số là “Bằng chữ (tổng cộng đã gồm thuế)”, dạng “đồng chẵn”.
- Phần điều kiện in sẵn: hiệu lực theo số ngày và ngày hết hạn, khối lượng phát sinh sẽ báo giá bổ sung, thời gian thi công, bảo hành theo tháng hoặc câu “Không áp dụng bảo hành”, thanh toán. Có tạm ứng thì ghi số tiền và số ngày sau khi ký, phần còn lại tính từ ngày nghiệm thu. Không tạm ứng thì chỉ ghi số ngày sau nghiệm thu.
- Cuối trang: “Xác nhận của khách hàng” và “Đại diện công ty”, tên người đại diện, dòng người lập báo giá.
- Sheet in đang lấy hạng mục của hợp đồng đầu tiên thuộc mã khách được chọn. Khi làm ứng dụng, in đúng báo giá đang mở.
- In chi tiết quyết toán dùng cùng kiểu bảng với báo giá.

## Điểm file này chưa theo bản nền

- Một hợp đồng chỉ có một giá trị trước thuế và một thuế suất. Chưa có cột giá ký và giá quản trị.
- Khách và hợp đồng nằm chung một dòng. Chưa có cây Hợp đồng → Gói/Điểm → Nhà → Ký hiệu cửa → Bộ.
- Lợi nhuận tạm tính trừ chi phí vật tư đã nhập, không tách giá vốn, hóa đơn và công nợ.
- Giao vật tư vào hợp đồng được cộng thẳng vào giá thành. Chưa có trạng thái đang giữ, đã lắp, vỡ, hoặc giao thẳng nhưng chưa tiêu hao.
- Chưa có gia công theo m², nhiều sổ công nợ nhà cung cấp, ủy nhiệm chi, hay khóa số sau đối chiếu.

Khi làm chứng từ trong ứng dụng, bám mẫu và thứ tự của file này cho phần văn phòng đang in. Phần giá, cây hạng mục và vật tư vẫn phải chừa chỗ cho bản nền, không khóa thiết kế theo Excel.
