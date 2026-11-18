import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../lib/alert/core.ts", import.meta.url),"utf8");
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {confirmed,createRunner} = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
test("Konfirmasi hanya menyetujui pilihan eksplisit", () => {
  assert.equal(confirmed({isConfirmed:false}),false);
  assert.equal(confirmed({isConfirmed:true}),true);
});
for (const fails of [false,true]) test("Loading ditutup sebelum " + (fails ? "gagal" : "sukses"), async () => {
  const events = [];
  const run = createRunner({ loading:()=>events.push("loading"),close:()=>events.push("close"),success:async()=>events.push("success"),failure:async()=>{events.push("failure");return false;} });
  const error = new Error("uji");
  const result = run(async()=>{events.push("request");if(fails) throw error;return 42;},{loadingTitle:"Tunggu",successMode:"modal"});
  if(fails) await assert.rejects(result, e=>e===error);
  else assert.equal(await result,42);
  assert.deepEqual(events,["loading","request","close",fails ? "failure" : "success"]);
});

// Gunakan adaptor SweetAlert dalam memori untuk menguji antarmuka publik tanpa browser.
async function setup(choices = []) {
  const calls = [];
  const source = fs.readFileSync(new URL("../lib/alert/index.ts",import.meta.url),"utf8");
  const compile = code => ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const {runInNewContext} = await import("node:vm");
  const popup = {
    fire: async options => {
      calls.push(options);
      options.didDestroy();
      return choices.shift() ?? {isConfirmed:false};
    },
    close() { calls.push("close"); },
    isVisible: () => false,
  };
  const exports = {};
  runInNewContext(compile(source),{exports, require: id => id === "sweetalert2" ? {default:popup} : {confirmed,createRunner},
    document:{querySelector:()=>null,body:{}},location:{pathname:"/lacak"},matchMedia:()=>({matches:false})});
  return {alert:exports.alert,calls};
}
test("Konfirmasi bahaya memfokuskan Batal dan menghormati keputusan", async () => {
  const {alert,calls} = await setup([{isConfirmed:false},{isConfirmed:true}]);
  let writes = 0;
  for(let i=0;i<2;i++) if(await alert.confirm({title:"Arsipkan?",danger:true})) writes++;
  assert.equal(writes,1);
  assert.equal(calls[0].focusCancel,true);
  assert.equal(calls[0].cancelButtonText,"Batal");
});
test("withLoading meneruskan hasil setelah loading dan sukses",async()=>{
  const {alert,calls}=await setup();
  assert.equal(await alert.withLoading(async()=>12,{loadingTitle:"Menyimpan",successTitle:"Tersimpan",successMode:"modal"}),12);
  assert.deepEqual(calls.map(c=>c.titleText ?? c),["Menyimpan","close","Tersimpan"]);
  assert.equal(calls[0].allowEscapeKey,false);
  assert.equal(calls[0].allowOutsideClick,false);
});
for(const [status,title] of [[403,"Anda tidak memiliki akses"],[409,"Periksa ketersediaan barang"],[422,"Periksa kembali isian Anda"],[429,"Terlalu banyak percobaan, coba lagi beberapa saat"],[500,"Permintaan gagal"]]) {
  test("withLoading menangani status "+status+" satu kali",async()=>{
    const {alert,calls}=await setup();
    const error=Object.assign(new Error("stok berubah"),{status,fields:{quantity:["Periksa jumlah."]}});
    let invalid;
    await assert.rejects(alert.withLoading(async()=>{throw error;},{loadingTitle:"Memproses",successMode:"none",onInvalid:f=>{invalid=f}}),e=>e===error);
    await alert.handleError(error);
    assert.deepEqual(calls.map(c=>c.titleText ?? c),["Memproses","close",title]);
    if(status===422) assert.equal(invalid,error.fields);
    if(status===500) assert.equal(calls[2].text,"Terjadi kesalahan pada server/koneksi.");
  });
}

