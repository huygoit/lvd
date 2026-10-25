import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kiemMotTep, tenGoc } from "@/modules/projects/document-check";

const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function loi(name: string, bytes: Buffer) {
  try {
    kiemMotTep(name, bytes.length, bytes);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "";
  }
}

describe("kiểm file tài liệu", () => {
  it("nhận văn bản và pdf đúng byte đầu", () => {
    const txt = Buffer.from("Biên bản nghiệm thu", "utf8");
    assert.equal(kiemMotTep("bien-ban.txt", txt.length, txt).kind, "txt");
    const pdf = Buffer.from("%PDF-1.4\n");
    assert.equal(kiemMotTep("hop-dong.pdf", pdf.length, pdf).kind, "pdf");
  });

  it("bỏ đường dẫn người dùng, chỉ giữ tên file", () => {
    assert.equal(tenGoc("..\\..\\tam\\a.txt"), "a.txt");
  });

  it("từ chối đuôi nguy hiểm và nội dung không khớp", () => {
    assert.match(loi("a.svg", Buffer.from("<svg")), /SVG/);
    assert.match(loi("a.html", Buffer.from("<html>")), /trang web/);
    assert.match(loi("a.js", Buffer.from("alert(1)")), /chương trình/);
    assert.match(loi("a.exe", Buffer.from("MZ")), /chương trình/);
    assert.match(loi("a.zip", Buffer.from("PK")), /ZIP/);
    assert.match(loi("a.rar", Buffer.from("Rar!")), /RAR/);
    assert.match(loi("a.bat", Buffer.from("echo")), /lệnh/);
    assert.match(loi("gia.pdf", Buffer.from("khong phai pdf")), /không khớp/);
    assert.match(loi("trang.txt", Buffer.from("<html><script>alert(1)</script></html>")), /không khớp/);
  });

  it("nhận word và excel khi có dấu nhận bên trong", () => {
    const doc = Buffer.concat([ole, Buffer.from("WordDocument", "utf16le")]);
    assert.equal(kiemMotTep("a.doc", doc.length, doc).kind, "doc");
    const xls = Buffer.concat([ole, Buffer.from("Workbook", "utf16le")]);
    assert.equal(kiemMotTep("a.xls", xls.length, xls).kind, "xls");
    const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("[Content_Types].xml word/")]);
    assert.equal(kiemMotTep("a.docx", docx.length, docx).kind, "docx");
    const macro = Buffer.concat([docx, Buffer.from("vbaProject.bin")]);
    assert.match(loi("macro.docx", macro), /không khớp/);
  });
});
