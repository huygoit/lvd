import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findUser } from "@/shared/auth/users";
import { buildNavigation } from "@/shared/config/navigation";
import { addDays, todayYmd, zonedHour } from "@/shared/lib/dates";
import { buildDemoDataset, emptyDataset } from "@/modules/dashboard/mocks/demo-data";
import { buildDashboardView, parseFilters } from "@/modules/dashboard/services/dashboard";
import type { Dataset, Quotation } from "@/modules/dashboard/types";

const now = new Date("2026-10-20T03:00:00.000Z");

function user(id: "minh" | "ha" | "khoa") {
  const found = findUser(id);
  assert.ok(found);
  return found;
}

function viewOf(id: "minh" | "ha" | "khoa", params: string, dataset = buildDemoDataset(todayYmd(now))) {
  return buildDashboardView({
    mode: "demo",
    user: user(id),
    dataset,
    now,
    filters: parseFilters(new URLSearchParams(params), now),
  });
}

function kpi(id: "minh" | "ha" | "khoa", key: string, params = "ky=30-ngay") {
  const card = viewOf(id, params).kpis.find((item) => item.id === key);
  assert.ok(card);
  return card;
}

describe("múi giờ và kỳ lọc", () => {
  it("chốt ngày theo Asia/Ho_Chi_Minh", () => {
    assert.equal(todayYmd(now), "2026-10-20");
    assert.equal(zonedHour(now), 10);
    assert.equal(todayYmd(new Date("2026-10-20T16:30:00.000Z")), "2026-10-20");
    assert.equal(todayYmd(new Date("2026-10-20T17:30:00.000Z")), "2026-10-21");
  });

  it("tính 7 ngày, tháng này và khoảng tùy chọn không hợp lệ", () => {
    const week = parseFilters(new URLSearchParams("ky=7-ngay"), now);
    assert.deepEqual([week.from, week.to], ["2026-10-14", "2026-10-20"]);
    const month = parseFilters(new URLSearchParams("ky=thang-nay"), now);
    assert.deepEqual([month.from, month.to], ["2026-10-01", "2026-10-20"]);
    const fallback = parseFilters(new URLSearchParams("ky=tuy-chon&tu=sai"), now);
    assert.equal(fallback.preset, "30-ngay");
    assert.equal(fallback.from, addDays("2026-10-20", -29));
  });
});

describe("tổng hợp báo giá và khách hàng", () => {
  it("không đếm trùng phiên bản cũ", () => {
    const created = kpi("minh", "bao-gia-lap");
    const today = todayYmd(now);
    const dataset = buildDemoDataset(today);
    const from = addDays(today, -29);
    const current = dataset.quotations.filter(
      (row) => row.isCurrent && row.createdOn >= from && row.createdOn <= today,
    ).length;
    const versions = dataset.quotations.filter((row) => row.createdOn >= from && row.createdOn <= today).length;
    assert.equal(created.raw, current);
    assert.equal(created.raw, 7);
    assert.ok(versions > current);
  });

  it("giá trị khách chấp thuận chỉ lấy phiên bản hiện hành và không gọi là hợp đồng", () => {
    const accepted = kpi("minh", "chap-thuan");
    assert.equal(accepted.raw, 1);
    assert.equal(accepted.amount, 510_000_000);
    assert.match(accepted.note, /Không phải giá trị hợp đồng/);
  });

  it("chờ duyệt là trạng thái hiện tại, không đổi theo kỳ", () => {
    const todayCard = kpi("minh", "cho-duyet", "ky=hom-nay");
    const monthCard = kpi("minh", "cho-duyet", "ky=30-ngay");
    assert.equal(todayCard.raw, 3);
    assert.equal(monthCard.raw, todayCard.raw);
    assert.equal(todayCard.basis, "hien-tai");
    assert.equal(kpi("minh", "bao-gia-lap", "ky=hom-nay").raw, 1);
  });

  it("kỳ trước bằng 0 thì không tạo tỷ lệ vô hạn", () => {
    const today = todayYmd(now);
    const dataset = emptyDataset();
    dataset.people = [{ id: "minh", name: "Trần Minh" }];
    dataset.customers = [
      { id: "c", code: "KH-1", name: "Khách Một", ownerId: "minh", createdOn: today },
    ];
    const card = viewOf("minh", "ky=30-ngay", dataset).kpis.find((item) => item.id === "khach-moi");
    assert.equal(card?.raw, 1);
    assert.equal(card?.delta, "Chưa có cơ sở so sánh");
  });

  it("một báo giá vừa chờ duyệt vừa sắp hết hạn chỉ thành một việc", () => {
    const tasks = viewOf("minh", "ky=30-ngay").tasks.rows.filter((row) => row.title.includes("BG-2026-014"));
    assert.equal(tasks.length, 1);
    assert.match(tasks[0].badge, /Chờ duyệt/);
    assert.match(tasks[0].badge, /sắp hết hạn/);
  });
});

describe("phạm vi quyền", () => {
  it("kinh doanh chỉ thấy dữ liệu được giao", () => {
    assert.equal(kpi("ha", "khach-moi").raw, 3);
    assert.equal(kpi("minh", "khach-moi").raw, 4);
    assert.equal(kpi("ha", "cho-duyet").raw, 2);
  });

  it("bộ lọc người phụ trách không nới quyền", () => {
    const ha = viewOf("ha", "ky=30-ngay&phu-trach=minh");
    assert.equal(ha.kpis.find((item) => item.id === "khach-moi")?.raw, 3);
    const minh = viewOf("minh", "ky=30-ngay&phu-trach=ha");
    assert.equal(minh.kpis.find((item) => item.id === "khach-moi")?.raw, 3);
  });

  it("kỹ thuật không nhận báo giá và không thấy chỉ số giả", () => {
    const khoa = viewOf("khoa", "ky=30-ngay");
    assert.equal(khoa.quotations.status, "hidden");
    assert.equal(khoa.kpis.some((item) => item.id === "cho-duyet"), false);
    assert.equal(khoa.projects.total, 1);
  });

  it("chưa nối nguồn dữ liệu thì không trả số 0", () => {
    const empty = buildDashboardView({
      mode: "none",
      user: user("minh"),
      dataset: emptyDataset(),
      now,
      filters: parseFilters(new URLSearchParams(), now),
    });
    assert.equal(empty.illustrative, false);
    assert.equal(empty.kpis.length, 0);
    assert.equal(empty.projects.status, "unavailable");
    assert.match(empty.situation, /nguồn dữ liệu/);
  });
});

describe("điều hướng theo quyền và trạng thái module", () => {
  it("thiếu quyền thì ẩn, chưa làm thì hiện mờ", () => {
    const minh = buildNavigation(user("minh"));
    const finance = minh.find((group) => group.id === "tai-chinh");
    const reports = minh.find((group) => group.id === "bao-cao");
    assert.ok(finance);
    assert.ok(reports);
    assert.equal(finance.items.every((item) => item.state === "disabled"), true);
    assert.equal(reports.items.every((item) => item.state === "disabled"), true);
    assert.equal(buildNavigation(user("ha")).some((group) => group.id === "tai-chinh"), false);
    assert.equal(buildNavigation(user("ha")).some((group) => group.id === "bao-cao"), false);
    const supply = buildNavigation(user("minh")).find((group) => group.id === "cung-ung");
    assert.deepEqual(
      supply?.items.map((item) => item.label),
      ["Mua hàng", "Đối tác", "Danh mục vật tư", "Kho/vật tư", "Nhận tại kho", "Vận chuyển"],
    );
    assert.equal(supply?.items[0]?.state, "disabled");
    assert.equal(supply?.items[1]?.state, "link");
    assert.equal(buildNavigation(user("ha")).some((group) => group.id === "cung-ung"), false);
    const hr = minh.find((group) => group.id === "nhan-su");
    assert.deepEqual(hr?.items.map((item) => item.label), ["Nhân viên", "Phòng ban", "Chức vụ", "Chức danh"]);
    assert.equal(minh.find((group) => group.id === "he-thong")?.items.some((item) => item.label === "Nhân viên"), false);
    const sales = buildNavigation(user("ha")).find((group) => group.id === "kinh-doanh");
    assert.deepEqual(
      sales?.items.map((item) => item.label),
      ["Khách hàng", "Báo giá", "Hợp đồng"],
    );
  });
});

describe("bản ghi tối thiểu không cộng giá trị phiên bản cũ", () => {
  it("hai phiên bản cùng mã chỉ giữ bản hiện hành", () => {
    const today = todayYmd(now);
    const quote = (patch: Partial<Quotation>): Quotation => ({
      id: "q",
      code: "BG-1",
      version: 1,
      isCurrent: false,
      projectId: "p",
      customerId: "c",
      ownerId: "minh",
      valueBeforeTaxVnd: 100,
      createdOn: today,
      validUntil: addDays(today, 5),
      acceptedOn: today,
      internalStatus: "da_duyet",
      customerStatus: "da_chap_thuan",
      ...patch,
    });
    const dataset: Dataset = {
      people: [{ id: "minh", name: "Trần Minh" }],
      customers: [],
      projects: [],
      appointments: [],
      quotations: [
        quote({ id: "old", version: 1, isCurrent: false, valueBeforeTaxVnd: 100 }),
        quote({ id: "new", version: 2, isCurrent: true, valueBeforeTaxVnd: 150 }),
      ],
    };
    const card = viewOf("minh", "ky=hom-nay", dataset).kpis.find((item) => item.id === "chap-thuan");
    assert.equal(card?.raw, 1);
    assert.equal(card?.amount, 150);
  });
});
