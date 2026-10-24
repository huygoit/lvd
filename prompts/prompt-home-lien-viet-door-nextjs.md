# PROMPT THIẾT KẾ VÀ TRIỂN KHAI HOME/DASHBOARD LIÊN VIỆT DOOR

## 1. Vai trò và nhiệm vụ

Bạn là Senior Product Designer và Senior Next.js Developer. Hãy thiết kế và triển khai trang Home/Dashboard sau đăng nhập cho hệ thống quản lý Liên Việt Door.

Mục tiêu thẩm mỹ: premium, hiện đại, chỉn chu, xanh dương gradient có chiều sâu, cảm giác sản phẩm doanh nghiệp cao cấp. Chất lượng thể hiện qua bố cục, typography, độ rõ của dữ liệu và tương tác; không dùng chữ “VIP”, “Pro Max” hay slogan công nghệ để trang trí giao diện.

Đây là dashboard vận hành nội bộ, không phải website giới thiệu công ty hay landing page bán hàng. Chỉ triển khai Home và khung điều hướng dùng chung trong nhiệm vụ này; không tự mở rộng thành toàn bộ ERP.

## 2. Bối cảnh doanh nghiệp

Công ty TNHH Liên Việt Door chuyên cung cấp, gia công và thi công lắp đặt các hệ thống cửa, nhôm kính và hạng mục kính hoàn thiện công trình:

- Cửa nhôm kính, cửa cuốn, cửa thép chống cháy, cửa inox, cửa nhựa Composite.
- Vách kính, cửa kính cường lực, lan can kính cầu thang và ban công.
- Phụ kiện, mô tơ và các vật tư lắp đặt đi kèm.

Công ty có xưởng riêng, đồng thời thuê xưởng ngoài gia công. Công ty bóc tách khối lượng từ thiết kế, mua vật tư, giao vật tư cho xưởng gia công, nhận thành phẩm rồi lắp đặt tại công trình.

Luồng tổng thể:

Khảo sát → Báo giá → Hợp đồng → Thiết kế/bóc tách → Kế hoạch vật tư → Mua hàng/cấp kho → Gia công nội bộ hoặc thuê ngoài → Nhận thành phẩm/kiểm tra → Giao hàng/lắp đặt → Nghiệm thu/quyết toán → Bảo hành.

Thu chi và công nợ phát sinh xuyên suốt quy trình. Một công trình có thể có nhiều hợp đồng, nhiều phiên bản báo giá, nhiều hạng mục và nhiều đợt giao nhận.

Phạm vi tài chính chỉ là tài chính quản trị: thu chi, số dư tiền, công nợ, tạm ứng, ngân sách, chi phí, dòng tiền và lãi lỗ công trình. Không xây định khoản Nợ/Có, sổ cái, kê khai thuế hay báo cáo tài chính theo chế độ kế toán trong nhiệm vụ này.

## 3. Phân tích codebase trước khi làm

Kiểm tra phiên bản Next.js/React/TypeScript, Router, package manager, component library, CSS/theme, cấu trúc module, auth, permissions, API client, query/cache, ORM và các component có thể tái sử dụng.

- Giữ convention dự án, tránh tạo component hoặc hạ tầng trùng chức năng.
- Nếu dự án đã có App Router thì dùng Route Handlers; nếu đang dùng Pages Router thì không tự migration chỉ để làm Home.
- Nếu là dự án mới, ưu tiên TypeScript, Next.js App Router, Tailwind CSS, shadcn/ui, Lucide Icons, Recharts. Chỉ thêm dependency cần thiết.
- Không thay design system hiện có chỉ để dùng một thư viện khác.
- Chưa có logo chính thức: dùng wordmark “LIÊN VIỆT DOOR” với biểu tượng khung cửa tối giản; không tự nhận biểu tượng đó là logo chính thức.

## 4. Kiến trúc modular monolith

- Một ứng dụng Next.js, frontend/backend cùng dự án, triển khai chung.
- Phân chia module theo nghiệp vụ: customers, projects, quotations, contracts, engineering, procurement, inventory, fabrication, installation, quality-warranty, finance, dashboard và system.
- PostgreSQL là định hướng cơ sở dữ liệu; tái sử dụng ORM hiện có. Không dựng toàn bộ schema ERP chỉ để render Home.
- Luồng tải dữ liệu và CRUD chính qua API nội bộ, không dùng Server Actions cho các luồng này.
- Route Handler xử lý HTTP, xác thực và validation; service giữ nghiệp vụ; repository đọc/ghi dữ liệu theo convention dự án.
- Dashboard là module tổng hợp dữ liệu qua các giao diện module được công khai hoặc read service chuyên dụng. Không sửa trạng thái nghiệp vụ trực tiếp từ widget.
- Component trình duyệt không truy cập database hay nhận thông tin kết nối database.
- Phân tách server/client rõ ràng, không biến cả trang thành một Client Component lớn.

Gợi ý tổ chức, chỉ áp dụng khi phù hợp codebase:

```text
src/app/(dashboard)/dashboard/page.tsx
src/app/api/dashboard/...
src/modules/dashboard/components/...
src/modules/dashboard/services/...
src/modules/dashboard/types/...
src/modules/dashboard/mocks/...
src/shared/components/...
src/shared/config/navigation.ts
src/shared/config/routes.ts
src/shared/auth/...
```

## 5. Phạm vi làm ngay và khả năng mở rộng

Thiết kế Home phản ánh được bức tranh ERP tổng thể, trong khi giai đoạn đầu ưu tiên Khách hàng – Hồ sơ công trình – Báo giá.

Mỗi module cần có trạng thái khả dụng: đã triển khai, chưa triển khai hoặc tạm không khả dụng. Trạng thái này độc lập với quyền người dùng.

- Module đã triển khai và có quyền: hiển thị dữ liệu và liên kết thật.
- Module chưa triển khai: trong bản thiết kế có thể cho thấy vị trí tương lai, gắn “Sắp triển khai”, không tạo liên kết lỗi hoặc số liệu giả như dữ liệu thật.
- Trong production, cấu hình mặc định ẩn widget chưa có nguồn dữ liệu; có thể hiển thị một thông báo “Chưa triển khai” gọn nếu cần định hướng.
- Không có quyền: ẩn module và dữ liệu liên quan; không dùng nhãn “Sắp triển khai” để thay thế trạng thái thiếu quyền.
- Demo riêng được dùng typed mock data với nhãn “Dữ liệu minh họa”, tách khỏi dữ liệu thật; không trộn mock vào dashboard production.

Home phải đẹp và có bố cục cân đối ngay cả khi chỉ ba module đầu được bật. Không để lại nhiều khung trống hoặc số 0 giả cho phần chưa làm.

## 6. Ngôn ngữ và đường dẫn

- Toàn bộ nội dung người dùng bằng tiếng Việt, hỗ trợ dấu đầy đủ.
- Thương hiệu hiển thị: “LIÊN VIỆT DOOR”; tên trang: “Tổng quan”.
- Mô tả phụ phù hợp: “Quản lý công trình và vận hành”.
- Ưu tiên `/dashboard`, hoặc giữ đường dẫn Home hiện có sau đăng nhập.
- Logo/wordmark đưa về trang Tổng quan.
- Định dạng số và tiền theo `vi-VN`, tiền mặc định VND; ngày `dd/MM/yyyy`.
- Mốc ngày và hạn nghiệp vụ theo `Asia/Ho_Chi_Minh`, tránh lệch ngày vì UTC.

## 7. Định hướng thị giác

Phong cách: premium enterprise dashboard, nền sáng lạnh, navy sâu, xanh dương rõ nét, gradient tiết chế và typography dễ đọc.

- Nền trang xanh xám rất nhạt, card trắng, text navy/slate.
- Card bo góc 16–20px, control 10–12px; dùng token nhất quán.
- Shadow mềm, border mảnh, khoảng cách 16–24px theo mật độ màn hình.
- Font hỗ trợ tiếng Việt tốt; ưu tiên font hiện có hoặc Be Vietnam Pro/Inter qua `next/font` nếu phù hợp môi trường. Có fallback khi không tải được font.
- Nội dung bảng khoảng 13–14px, nội dung chính 14–16px, KPI 28–36px tùy màn hình.
- Số tiền dùng tabular numerals để dễ so sánh.
- Có thể dùng đường nét khung cửa, nhịp đứng của mặt dựng kính hoặc nét bản vẽ kỹ thuật thật nhẹ trong banner; không dùng ảnh công trình lớn làm mất diện tích dữ liệu.
- Không dùng quá nhiều glassmorphism, neon, glow, gradient, card nổi hoặc animation.

## 8. Bảng màu và gradient

Xây bằng CSS variables/design tokens, không hard-code màu rải rác.

| Token | Màu đề xuất | Vai trò |
|---|---|---|
| Brand navy | `#0B1F44` | Điểm neo thương hiệu, banner |
| Deep blue | `#143B8F` | Gradient sâu, trạng thái active đậm |
| Primary | `#1D4ED8` | CTA chính, link và focus |
| Bright blue | `#2563EB` | Biểu đồ, điểm nhấn |
| Sky accent | `#38BDF8` | Ánh sáng trang trí, điểm nhấn phụ |
| Soft blue | `#EFF6FF` | Icon tile, menu active nhẹ |
| Page background | `#F4F7FC` | Nền trang |
| Surface | `#FFFFFF` | Card và bảng |
| Primary text | `#0F172A` | Nội dung chính |
| Secondary text | `#64748B` | Chú thích |
| Border | `#E2E8F0` | Viền nhẹ |

Gradient đề xuất:

```css
--gradient-brand: linear-gradient(120deg, #0B1F44 0%, #143B8F 52%, #2563EB 100%);
--gradient-primary: linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%);
--gradient-soft: linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 55%, #FFFFFF 100%);
```

- Gradient mạnh tập trung ở Welcome Section và CTA chính, tối đa thêm một card nổi bật khi thật cần.
- Chữ trên vùng gradient navy/blue dùng trắng; đặt text ở vùng nền đủ tối. Sky accent chủ yếu trang trí, không dùng làm nền cho chữ trắng nhỏ.
- Màu trạng thái riêng: xanh lá thành công, amber cảnh báo, đỏ nguy cấp/lỗi, slate trung tính. Không dùng xanh dương cho mọi trạng thái.
- Kiểm tra tương phản chữ thường tối thiểu 4.5:1 và chữ lớn 3:1. Không mặc định màu thương hiệu nào cũng đạt khi phối với mọi nền.

## 9. Bố cục tổng thể

Không sử dụng sidebar cố định bên trái.

Thứ tự từ trên xuống:

1. Header thương hiệu và tiện ích.
2. Navigation ngang theo nhóm nghiệp vụ.
3. Welcome Section gọn với bộ lọc và CTA.
4. KPI Cards.
5. Việc cần xử lý dạng hàng compact/quick actions.
6. Tổng quan công trình kết hợp danh sách công việc, cảnh báo.
7. Bốn biểu đồ quản trị trong bố cục 2×2 ở chế độ đầy đủ.
8. Báo giá gần đây và lịch giao/lắp đặt sắp tới.
9. Footer tối giản nếu hệ thống đang có.

Ở viewport desktop 1440px, phần đầu phải cho thấy Header, menu, banner gọn, KPI và ít nhất phần đầu khu vực công trình/việc cần xử lý. Không làm hero cao như landing page.

Nội dung tận dụng chiều rộng, có max-width khoảng 1600px và padding thích ứng. Header/menu có thể sticky nhưng tổng chiều cao cần gọn; tránh hai lớp sticky che nội dung hoặc dropdown.

## 10. Header

Bên trái: wordmark/logo, nhấn về Tổng quan.

Ở giữa: tìm kiếm khách hàng, công trình, báo giá hoặc hợp đồng tùy module khả dụng và quyền. Kết quả chia nhóm, có loading/empty; tìm theo mã hoặc tên. Chỉ triển khai tìm kiếm thật cho nguồn đã tồn tại, không tạo ô tìm kiếm bấm không có tác dụng. Shortcut chỉ thêm nếu đã xử lý và hướng dẫn đúng.

Bên phải: thông báo chưa đọc, avatar/tên/vai trò, menu tài khoản và đăng xuất theo auth hiện có. Theme toggle chỉ có khi dự án thực sự hỗ trợ dark mode. Không thêm bộ chọn workspace/chi nhánh khi chưa có nghiệp vụ đó.

Mobile: logo gọn, nút tìm kiếm nếu khả dụng, thông báo, tài khoản và hamburger; co gọn theo chiều rộng, không ép tất cả text vào một hàng.

## 11. Navigation ngang

Nhóm chính:

| Menu | Mục con dự kiến |
|---|---|
| Tổng quan | Liên kết trực tiếp về Home |
| Kinh doanh | Khách hàng, Báo giá, Hợp đồng/phụ lục |
| Công trình | Danh sách công trình, Thiết kế/bóc tách, Tiến độ, Hồ sơ công trình |
| Cung ứng | Mua hàng, Nhà cung cấp, Kho/vật tư |
| Sản xuất & Thi công | Gia công nội bộ, Gia công thuê ngoài, Giao hàng/lắp đặt, Chất lượng/bảo hành |
| Tài chính | Thu chi, Công nợ, Tạm ứng, Chi phí công trình, Dòng tiền |
| Báo cáo | Báo cáo công trình, Vật tư/gia công, Tài chính quản trị |
| Hệ thống | Người dùng, Vai trò & quyền, Danh mục, Cấu hình công ty |

Không lặp nhiều màn hình cùng chức năng chỉ vì xuất hiện ở nhiều nhóm. Mỗi màn hình có một vị trí điều hướng chính; ngữ cảnh công trình có thể dẫn đến dữ liệu liên quan.

- Desktop dùng dropdown hoặc mega menu, mở bằng click, hỗ trợ bàn phím và Escape.
- Menu active có text xanh đậm, nền xanh nhẹ hoặc underline; không chỉ đổi màu khó nhận biết.
- Chỉ hiển thị nhóm còn ít nhất một mục hợp lệ theo quyền và trạng thái module.
- Laptop/tablet: thu gọn vào “Thêm” hoặc hamburger trước khi tràn. Không ép chữ nhỏ hoặc cho menu xuống nhiều dòng.
- Mobile mở Sheet/Drawer với Accordion, tự đóng khi chọn chức năng, quản lý focus đúng, không có sidebar cố định.
- Module chưa làm chỉ được hiện ở dạng disabled có nhãn khi cấu hình cho phép, không dùng `href="#"` hoặc tạo đường dẫn 404.

## 12. Welcome Section

Banner ngang thấp, gradient navy → royal blue, chữ trắng, họa tiết khung kính mờ ở một phía.

Nội dung:

- Lời chào và tên người dùng; ví dụ “Chào buổi sáng, Minh”.
- Một câu tình hình có dữ liệu thật, ví dụ “Có 3 báo giá chờ duyệt và 2 lịch lắp đặt hôm nay”. Chỉ tính từ dữ liệu được phép xem.
- Bộ chọn khoảng ngày, bộ lọc người phụ trách/công trình khi khả dụng.
- Nút Làm mới, thời điểm cập nhật dữ liệu gần nhất.
- CTA “Tạo báo giá” khi có quyền và module khả dụng; CTA phụ “Thêm công trình”.

Không gọi thời gian tải API là “đồng bộ” nếu chưa có cơ chế đồng bộ. Không hiển thị số liệu minh họa như dữ liệu thật.

## 13. Bộ lọc và ý nghĩa thời gian

Khoảng ngày gồm: Hôm nay, 7 ngày gần nhất, 30 ngày gần nhất, Tháng này, Tùy chọn.

Phân biệt rõ:

- Chỉ số phát sinh theo kỳ: khách hàng mới, báo giá tạo trong kỳ, giá trị hợp đồng ký trong kỳ, thu/chi phát sinh trong kỳ.
- Chỉ số tại một thời điểm: công trình đang triển khai, báo giá đang chờ duyệt, công nợ còn phải thu tại ngày cuối kỳ.
- Danh sách sắp tới/quá hạn: theo ngày hiện tại hoặc khoảng lịch riêng được ghi rõ, không âm thầm dùng cùng bộ lọc kỳ.

Label/subtitle hoặc tooltip phải thể hiện cơ sở tính. API trả về khoảng kỳ và mốc chốt thực tế. Không lấy giá trị hiện tại gắn nhãn lịch sử nếu chưa có dữ liệu lịch sử.

## 14. KPI Cards

Chế độ ERP đầy đủ, ưu tiên sáu card:

1. Công trình đang triển khai — số lượng tại mốc chốt; kèm số công trình quá hạn nếu có.
2. Báo giá chờ duyệt — số phiên bản hiện hành chờ duyệt tại mốc chốt.
3. Giá trị hợp đồng ký trong kỳ — giá trị ký mới; ghi rõ cơ sở trước/sau thuế và cách xử lý phụ lục.
4. Thu tiền trong kỳ — tiền thực thu khách hàng hợp lệ trong kỳ.
5. Chi tiền trong kỳ — tiền thực chi ra bên ngoài hợp lệ trong kỳ.
6. Công nợ khách hàng — còn phải thu tại mốc chốt, kèm phần quá hạn.

Chuyển tiền giữa quỹ/tài khoản của công ty không tính tăng tổng thu/chi từ bên ngoài. Không gọi tiền thực thu là doanh thu. Không tính toàn bộ giá trị báo giá thành giá trị hợp đồng.

Giai đoạn đầu chỉ có Khách hàng/Công trình/Báo giá: dùng 4–6 card thực sự có dữ liệu như Khách hàng mới, Công trình đang báo giá, Báo giá lập trong kỳ, Báo giá chờ duyệt, Báo giá đang thương lượng, Báo giá được chấp thuận trong kỳ. Phải có định nghĩa trạng thái thực tế, không tự bịa bộ đếm chưa được backend hỗ trợ.

Mỗi card: icon, label, giá trị, chú thích, link drill-down. So sánh kỳ trước chỉ có khi có dữ liệu và định nghĩa tương đương; mẫu số bằng 0 hiển thị “Chưa có cơ sở so sánh”, không sinh Infinity. Không mặc định tăng chi hoặc tăng công nợ là tín hiệu tích cực.

Nền chủ yếu trắng, icon tile xanh nhạt. KPI cần quyền tài chính riêng phải được ẩn cùng toàn bộ dữ liệu liên quan.

## 15. Quick Actions

Ưu tiên tối đa 4–6 thao tác theo vai trò:

- Thêm khách hàng.
- Thêm công trình.
- Tạo báo giá.
- Tạo đề nghị mua vật tư.
- Tạo lệnh gia công.
- Lập phiếu thu/chi hoặc cập nhật thi công khi đã có module và quyền.

Điều hướng đến màn hình đúng chức năng. Không triển khai form nghiệp vụ phức tạp ngay trên Home. Không để nút trang trí không hoạt động.

## 16. Công trình cần theo dõi

Đây là vùng dữ liệu trọng tâm, chiếm khoảng 2/3 chiều rộng desktop; cạnh phải là Việc cần xử lý.

Bảng gồm:

- Mã/tên công trình và địa điểm ngắn.
- Khách hàng.
- Người phụ trách.
- Giai đoạn hiện tại: khảo sát/báo giá, chuẩn bị, gia công, lắp đặt, nghiệm thu… theo state model có thật.
- Tiến độ có nguồn đo rõ ràng.
- Mốc tiếp theo, hạn và dấu hiệu quá hạn.
- Thao tác xem chi tiết, xem tất cả.

Không chuyển số thứ tự giai đoạn thành phần trăm hoàn thành. Nếu chưa có khối lượng/kế hoạch đủ để đo tiến độ, chỉ hiển thị giai đoạn và mốc kế tiếp.

Công trình có nhiều hạng mục chạy song song không được ép thành một giai đoạn gây hiểu sai; có thể hiển thị giai đoạn chính kèm số hạng mục ở các giai đoạn khác. Không coi công trình hoàn thành thi công là đã thu đủ tiền.

Giới hạn 5–8 dòng ở Home, ưu tiên quá hạn/cần xử lý; mobile chuyển thành card gọn. Không đưa bảng tài chính rộng vào vùng này mặc định.

## 17. Việc cần xử lý và cảnh báo

Hiển thị theo quyền, người phụ trách, hạn và mức độ:

- Báo giá chờ duyệt, báo giá sắp hết hiệu lực cần theo dõi.
- Bản vẽ/bóc tách chờ duyệt.
- Vật tư thiếu, đơn mua giao trễ.
- Lệnh gia công sắp đến hạn/quá hạn.
- Thành phẩm lỗi cần xử lý.
- Lịch giao/lắp đặt hôm nay hoặc sắp đến hạn.
- Nghiệm thu chờ xác nhận.
- Khoản phải thu/phải trả đến hạn, tạm ứng chưa quyết toán.
- Yêu cầu bảo hành chưa xử lý.

Mỗi mục có tiêu đề, bản ghi liên quan, hạn, người phụ trách, badge và liên kết. Không đếm một việc nhiều lần nếu nó xuất hiện ở nhiều cảnh báo. Không tự động gửi email/tin nhắn ra ngoài chỉ vì widget xuất hiện.

## 18. Bốn biểu đồ quản trị

Chế độ đầy đủ dùng grid 2×2, mỗi biểu đồ trả lời một câu hỏi cụ thể. Không biến Home thành trang chỉ toàn chart.

### A. Thu – Chi thực tế

- Grouped Bar hoặc Line theo ngày/tuần/tháng.
- Hai chuỗi tiền thực thu và thực chi, cùng đơn vị.
- Có thể hiển thị chênh lệch thu chi bằng số riêng; không gọi là lợi nhuận.
- Loại trừ chuyển tiền nội bộ và phiếu hủy theo quy tắc tài chính.

### B. Phân bố giai đoạn công trình

- Horizontal Bar, hoặc Donut khi mỗi công trình có một nhóm chính độc quyền.
- Chốt tại mốc được ghi rõ; tổng phải khớp tập công trình đang thống kê.
- Nếu đếm hạng mục thay vì công trình phải đổi tên biểu đồ và đơn vị tương ứng, tránh đếm trùng.

### C. Ngân sách và chi phí công trình

- Grouped Horizontal Bar cho tối đa 5 công trình cần theo dõi.
- Ngân sách được duyệt, chi phí thực tế, dự kiến tổng chi phí hoàn thành nếu có đủ dữ liệu.
- Chi phí cam kết còn lại chỉ cộng khi đã loại phần nhận hàng/nghiệm thu trùng với chi phí thực tế.
- Vượt ngân sách có nhãn; khoản thiếu dự toán là “Chưa lập ngân sách”, không thay bằng 0.

### D. Giá trị nghĩa vụ thanh toán đến hạn

- Bar theo tuần: khoản dự kiến thu và khoản dự kiến trả chưa thanh toán.
- Ghi rõ “Theo lịch thanh toán”, tách phần quá hạn.
- Chưa có ngày đến hạn xếp vào “Chưa xác định hạn”, không tự gán vào tuần hiện tại.
- Không trình bày đây là số dư tiền tương lai chắc chắn.

Giai đoạn đầu chưa có tài chính/gia công: thay bằng biểu đồ khách hàng mới theo kỳ, số báo giá lập theo kỳ, phân bố trạng thái báo giá hiện hành, công trình theo giai đoạn kinh doanh nếu có đủ dữ liệu. Có thể chỉ hiển thị ít chart hơn khi nguồn chưa đủ; không bắt buộc dựng API tài chính giả để đủ bốn khung.

Tooltip/legend phải rõ, biểu đồ có loading/empty/error/retry, xử lý toàn số 0, có thông tin thay thế cho người dùng screen reader. Không trộn số tiền và số lượng trên một trục.

## 19. Báo giá gần đây và lịch sắp tới

Báo giá: mã, phiên bản, công trình, khách hàng, giá trị, ngày lập, hiệu lực, người phụ trách và trạng thái. Danh sách tổng hợp dùng phiên bản hiện hành của mỗi báo giá; lịch sử phiên bản xem tại chi tiết, tránh nhân đôi tổng giá trị.

Phân biệt trạng thái duyệt nội bộ với phản hồi khách hàng. “Đã duyệt” không đồng nghĩa “Khách đã chấp thuận”. Tôn trọng mô hình trạng thái hiện có; nếu chưa có phải định nghĩa rõ contract trước khi dùng mock.

Lịch sắp tới: giao vật tư, nhận hàng gia công, giao thành phẩm, lắp đặt, nghiệm thu. Mỗi mục có ngày/giờ nếu có, công trình, địa điểm, đội/người phụ trách, tình trạng xác nhận. Mốc không có giờ hiển thị theo ngày, không tự bịa 08:00.

## 20. Phân quyền và phạm vi dữ liệu

Vai trò dự kiến: lãnh đạo, kinh doanh, kỹ thuật, mua hàng, thủ kho, quản lý xưởng, quản lý thi công, tài chính quản trị và quản trị hệ thống.

- Kinh doanh ưu tiên khách hàng, báo giá, công trình phụ trách.
- Kỹ thuật ưu tiên bản vẽ/bóc tách.
- Kho/xưởng ưu tiên vật tư, lệnh, giao nhận.
- Thi công ưu tiên lịch và công trình được giao.
- Tài chính ưu tiên thu chi, công nợ, tạm ứng.
- Lãnh đạo xem tổng hợp theo quyền được cấp.

Tái sử dụng permission registry, không hard-code role name để cấp quyền. Ví dụ capability: `customers.view`, `projects.view`, `quotations.create`, `quotations.approve`, `finance.cashflow.view`, `finance.profit.view`; tên cuối cùng theo dự án.

API kiểm tra quyền độc lập với UI và giới hạn theo công trình được giao. Tổng số, chart, search, thông báo và tooltip đều tuân thủ cùng phạm vi. Không gửi dữ liệu tài chính xuống client rồi chỉ ẩn bằng CSS. Không cache chung response chứa dữ liệu riêng giữa người dùng.

## 21. Dữ liệu/API và mock

Tái sử dụng API hiện có. Nếu chưa có, đề xuất số endpoint tổng hợp hợp lý, ví dụ:

```text
GET /api/dashboard/summary
GET /api/dashboard/projects
GET /api/dashboard/tasks
GET /api/dashboard/charts
```

Đây là gợi ý, không bắt buộc tạo đúng bốn endpoint. Không gọi một request cho mỗi KPI hoặc từng dòng bảng.

Contract TypeScript cần mô tả:

- Bộ lọc, phạm vi quyền, mốc chốt và kỳ dữ liệu.
- Module khả dụng, widget khả dụng, quyền hành động.
- KPI và định nghĩa/phạm vi tính.
- Danh sách công trình, báo giá, công việc, lịch.
- Dữ liệu chart, đơn vị, thời điểm cập nhật và trạng thái từng phần.

Phân biệt `0`, `null` và không có quyền: `0` là giá trị xác định bằng 0; `null` là chưa xác định/chưa có dữ liệu; thiếu quyền không được kèm giá trị bí mật.

Mock đặt riêng trong module dashboard, chỉ bật bằng cấu hình môi trường development/demo rõ ràng. Không fallback sang mock khi API thật lỗi. Mock phải nhất quán giữa KPI, bảng và chart; tên khách/công trình là giả lập.

## 22. Trạng thái giao diện và tương tác

- Loading: Skeleton đúng kích thước, hạn chế layout shift.
- Empty: mô tả đúng lý do, CTA tạo bản ghi nếu có quyền.
- Error: thông báo dễ hiểu, nút thử lại, không lộ stack trace.
- Partial failure: widget lỗi không phá hỏng phần còn lại.
- Refresh: chống request trùng, hủy/loại response cũ khi đổi filter nhanh.
- Stale data: nếu giữ dữ liệu cũ khi refresh lỗi phải ghi rõ thời điểm cập nhật.
- Unauthorized: xử lý theo auth convention, không biến lỗi 403 thành số 0.
- Chưa triển khai: xử lý theo trạng thái module, không nhầm với hệ thống chưa có bản ghi.

Click KPI đưa tới danh sách tương ứng với bộ lọc và phạm vi phù hợp. Filter có thể lưu trên URL nếu codebase đã có convention. Các nút bấm phải có kết quả rõ ràng.

## 23. Responsive, accessibility và animation

Kiểm tra tại 320, 375, 430, 768, 1024, 1366 và 1440px trở lên.

- Không sidebar cố định, không overflow toàn trang.
- KPI: desktop 3 hoặc 6 cột theo độ rộng thực tế, tablet 2–3, mobile 1–2 tùy nội dung. Không ép sáu card nhỏ trên laptop.
- Công trình/công việc: desktop 2/3–1/3, mobile xếp dọc.
- Chart 2×2 trên màn hình đủ rộng, mobile một cột.
- Bảng có card mobile hoặc vùng cuộn cục bộ, giữ mã/tên và thao tác dễ tìm.
- Menu, date picker, tooltip, dropdown không vượt viewport.
- Semantic HTML, heading đúng cấp, label cho filter/nút icon, focus rõ.
- Drawer/dialog giữ focus, Escape đóng và trả focus về nút mở.
- Trạng thái có text/icon, không chỉ màu sắc.
- Vùng chạm khoảng 44px, hỗ trợ bàn phím.
- Motion nhẹ 150–250ms, tôn trọng `prefers-reduced-motion`; không animation liên tục.

Light mode là ưu tiên bắt buộc. Nếu dự án có dark mode thì bảo đảm màu token, biểu đồ, tooltip và trạng thái đều đọc được; không thêm công tắc theme giả.

## 24. Hiệu năng và an toàn kỹ thuật

- Tận dụng query/cache hiện có; query key gồm filter và phạm vi người dùng phù hợp.
- Lazy-load chart/component nặng khi cần, giữ shell nhẹ.
- Không request từng dòng hoặc tải toàn bộ dữ liệu ERP để tính tại browser.
- Tiền và phép tính tổng hợp dùng kiểu chính xác ở backend theo convention; không tính tổng tài chính quan trọng bằng số dấu phẩy động tùy tiện tại UI.
- Không lộ credential, dữ liệu không có quyền hoặc thông tin lỗi nội bộ.
- Không sửa module không liên quan; không thay authentication hay schema diện rộng để hoàn thiện một widget.
- Không dùng `any` tùy tiện, không bỏ qua lỗi TypeScript, không tạo liên kết không hoạt động.

## 25. Tiêu chí nghiệm thu

1. Thể hiện đúng thương hiệu và nghiệp vụ Liên Việt Door, không còn Etsy/WooCommerce/Printify/tracking đơn hàng online.
2. Chủ đạo xanh dương gradient navy–royal blue, nền sáng, chữ rõ, cảm giác cao cấp và gọn.
3. Header và navigation ngang; không sidebar cố định.
4. Có Welcome Section, filter, KPI, Quick Actions, công trình, việc cần xử lý và báo giá gần đây theo module khả dụng.
5. Chế độ đầy đủ có bốn nhóm chart; chế độ giai đoạn đầu thích ứng với dữ liệu thật sẵn có.
6. Module chưa triển khai và dữ liệu bằng 0 được xử lý khác nhau.
7. Phân biệt thu/chi, doanh thu/chi phí, công nợ và giá trị hợp đồng.
8. Bản báo giá không bị đếm trùng qua nhiều phiên bản; trạng thái duyệt nội bộ và khách chấp thuận rõ ràng.
9. API, menu, KPI, chart, search và action đều kiểm tra quyền/phạm vi.
10. Loading, empty, error, retry, partial failure và refresh hoạt động.
11. Không dùng mock trong production, không fallback mock khi lỗi API.
12. Responsive, keyboard và tương phản được kiểm tra; không có overflow ngoài vùng cho phép.
13. Typecheck, lint và build chạy theo script thực tế của dự án; báo đúng kết quả và giới hạn môi trường.
14. Có kiểm tra phù hợp cho quyền, filter thời gian, dữ liệu rỗng và phép tổng hợp tài chính nếu có triển khai; không viết test chỉ để lặp lại markup.
15. Không triển khai nghiệp vụ ERP ngoài phạm vi Home nếu chưa được yêu cầu.

## 26. Trình tự thực hiện và bàn giao

1. Kiểm tra codebase; báo ngắn các phần tái sử dụng, module/API đã có và đang thiếu.
2. Chốt giả định triển khai bằng thông tin có sẵn; chỉ hỏi khi có điểm chặn thực sự. Nếu chưa có backend, hoàn thiện chế độ demo tách biệt và nêu rõ giới hạn.
3. Xây design tokens, app shell, navigation, responsive và các vùng dashboard theo phạm vi.
4. Kết nối API có thật, tách mock, xử lý quyền và trạng thái module.
5. Kiểm tra các viewport, tương tác, dữ liệu, permission và chạy kiểm tra kỹ thuật phù hợp.
6. Báo cáo ngắn: đã làm gì, file thay đổi, nguồn dữ liệu/API, phần mock, module chưa làm, kết quả kiểm tra và giới hạn còn lại.

Kết quả mong muốn: một trang Tổng quan Liên Việt Door có phong cách xanh dương gradient cao cấp, dùng được trong giai đoạn đầu Khách hàng – Công trình – Báo giá và mở rộng được sang ERP đầy đủ mà không phải thiết kế lại khung giao diện.
