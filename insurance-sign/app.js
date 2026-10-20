"use strict";

// Sign Once: all PDFs and ink stay in local browser memory. No fetch/uploads of document bytes.
// Linked third-party libraries are version-pinned; see README before handling sensitive documents.
(() => {
  const $ = (id) => document.getElementById(id);
  const state = { docs: [], currentId: null, mode: "draw", drawing: false, drawn: false, typedReady: false, placementMode: "none", generating: false, outputs: [], toastTimeout: null };
  const PRESETS = [
    { test: /(?:^|[^A-Z])ALLIANZ|CARE[_ -]?FMU/i, page: 14, x: 40, y: 399, w: 117, h: 41, key: "allianz" },
    { test: /VUMI/i, page: 7, x: 232, y: 439, w: 112, h: 25, key: "vumi" },
    { test: /FOYER[_ -]?EXTENSIVE|APPLICATION[_ -]?FORM[_ -]?T2[-_]?4/i, page: 14, x: 220, y: 631, w: 155, h: 17, key: "foyer" },
    { test: /FOYER[_ -]?BASIC|APPLICATION[_ -]?FORM[_ -]?T1/i, page: 12, x: 219, y: 631, w: 154, h: 17, key: "foyer" },
    { test: /IMG[_ -]?LUMA|GPMI[_ -]?FULL/i, page: 7, x: 312, y: 585, w: 241, h: 34, key: "img" },
    { test: /AXA|GHP[_ -]?INDIVIDUAL/i, key: "axa", noPreset: true },
    { test: /CIGNA/i, key: "cigna", noPreset: true },
    { test: /OPTIMUM/i, key: "optimum", block: true },
  ];
  const ui = {
    files: $("file-input"), dropzone: $("dropzone"), list: $("file-list"), count: $("files-count"), demo: $("demo"), reset: $("reset"),
    current: $("current-file"), prev: $("page-prev"), next: $("page-next"), pages: $("page-counter"), pdf: $("pdf-preview"), stage: $("pdf-stage-inner"),
    stamp: $("stamp-preview"), dateStamp: $("manual-date-preview"), previewArea: $("preview-area"), previewEmpty: $("empty-preview"), warning: $("preview-warning"),
    move: $("move-signature"), placeDate: $("place-date"), remove: $("remove-position"), help: $("position-help"), approve: $("approve-doc"),
    signCanvas: $("signature-canvas"), modeDraw: $("mode-draw"), modeType: $("mode-type"), drawPanel: $("draw-mode"), typePanel: $("type-mode"),
    clear: $("clear-signature"), typed: $("signature-text"), useType: $("use-type"), signState: $("signature-state"), signDate: $("sign-date"),
    finalConsent: $("final-consent"), generate: $("generate"), share: $("share-all"), ready: $("ready-status"), result: $("result-list"), progress: $("progress"), fill: $("progress-fill"),
    toast: $("toast"), bundle: $("bundle-state"), bundleTitle: $("bundle-title"), bundleDetail: $("bundle-detail"), approveAll: $("approve-all"),
  };

  const signCtx = ui.signCanvas.getContext("2d");
  ui.signCanvas.style.touchAction="none";
  ui.signCanvas.style.userSelect="none";
  ui.signCanvas.style.webkitUserSelect="none";
  document.documentElement.style.overflowX="hidden";
  signCtx.strokeStyle = "#12273e";
  signCtx.fillStyle = "#12273e";
  signCtx.lineWidth = 5;
  signCtx.lineCap = "round";
  signCtx.lineJoin = "round";

  function notify(text, type = "normal") {
    ui.toast.textContent = text;
    ui.toast.className = "toast " + (type === "error" ? "error" : type === "good" ? "good" : "");
    ui.toast.hidden = false;
    if(type==="error" && /מיקום חתימה/.test(text)) ui.toast.style.opacity="0.95";
    if (state.toastTimeout) clearTimeout(state.toastTimeout);
    state.toastTimeout = setTimeout(() => { ui.toast.hidden = true; }, 8500);
  }
  let verifiedWorkerURL = null;
  async function verifyPdfWorker() {
    if (!window.pdfjsLib) throw new Error("ספריית PDF לא נטענה — בדוק חיבור לאינטרנט");
    const url = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const response = await fetch(url,{mode:"cors",cache:"force-cache",referrerPolicy:"no-referrer"});
    if(!response.ok) throw Error("טעינת מנוע התצוגה נכשלה");
    const contents = await response.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-512",contents);
    const bytes=new Uint8Array(digest);
    const base64=btoa(String.fromCharCode(...bytes));
    const allowed="BbrZ76UNZq5BhH7LL7pn9A4TKQpQeNCHOo65/akfelcIBbcVvYWOFQKPXIrykE3qZxYjmDX573oa4Ywsc7rpTw==";
    if(base64!==allowed) throw Error("בדיקת שלמות קוד תצוגת PDF נכשלה — הנתונים לא פוענחו");
    verifiedWorkerURL=URL.createObjectURL(new Blob([contents],{type:"text/javascript"}));
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=verifiedWorkerURL;
    return true;
  }
  const libsReady = () => !!(window.PDFLib && window.pdfjsLib);
  function requireLibs() { if (!libsReady()) { notify("ספריות ה-PDF לא נטענו. בדוק/י חיבור לאינטרנט ורענן/י את העמוד. המסמכים לא נשלחו לשום שרת.", "error"); return false; } return true; }
  function cleanOutputs() { for (const o of state.outputs) URL.revokeObjectURL(o.url); state.outputs = []; ui.result.innerHTML = ""; ui.share.hidden=true; }
  function currentDoc() { return state.docs.find(d => d.id === state.currentId) || null; }
  function setToday() { const d = new Date(); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); ui.signDate.value = local; }
  setToday();

  // Inkpad uses fixed backing pixel dimensions for reproducible signatures on touch and mouse.
  function xy(event) { const r = ui.signCanvas.getBoundingClientRect(); return { x: (event.clientX - r.left) * ui.signCanvas.width / r.width, y: (event.clientY - r.top) * ui.signCanvas.height / r.height }; }
  function signatureIsReady() { return state.mode === "draw" ? state.drawn : state.typedReady; }
  function updateSignatureState() { const okay = signatureIsReady(); ui.signState.textContent = okay ? "✓ חתימה קיימת — ניתן להשתמש בה במסמכים שתאשר/י" : "טרם נוספה חתימה"; ui.signState.className = "signature-state" + (okay ? " signed" : ""); updateReady(); }
  ui.signCanvas.addEventListener("pointerdown", e => {
    if (state.mode !== "draw") return;
    e.preventDefault(); state.drawing = true; try { ui.signCanvas.setPointerCapture(e.pointerId); } catch (_) {} const p = xy(e);
    signCtx.beginPath(); signCtx.moveTo(p.x, p.y); signCtx.lineTo(p.x + .1, p.y + .1); signCtx.stroke(); state.drawn = true; updateSignatureState();
  });
  ui.signCanvas.addEventListener("pointermove", e => { if (!state.drawing || state.mode !== "draw") return; e.preventDefault(); const p = xy(e); signCtx.lineTo(p.x, p.y); signCtx.stroke(); });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) ui.signCanvas.addEventListener(event, () => { if (state.drawing) { state.drawing = false; signCtx.closePath(); } });
  for(const name of ["touchstart","touchmove","touchend"]){ui.signCanvas.addEventListener(name,e=>{if(e.cancelable)e.preventDefault();},{passive:false});}
  ui.clear.addEventListener("click", () => { signCtx.clearRect(0, 0, ui.signCanvas.width, ui.signCanvas.height); state.drawn = false; updateSignatureState(); cleanOutputs(); });
  function switchMode(mode) {
    state.mode = mode;
    ui.drawPanel.hidden = mode !== "draw"; ui.typePanel.hidden = mode !== "type";
    ui.modeDraw.classList.toggle("active", mode === "draw"); ui.modeType.classList.toggle("active", mode === "type");
    ui.modeDraw.setAttribute("aria-pressed", String(mode === "draw")); ui.modeType.setAttribute("aria-pressed", String(mode === "type"));
    updateSignatureState(); cleanOutputs();
  }
  ui.modeDraw.addEventListener("click", () => switchMode("draw")); ui.modeType.addEventListener("click", () => switchMode("type"));
  ui.typed.addEventListener("input", () => { state.typedReady = false; updateSignatureState(); });
  ui.useType.addEventListener("click", () => { if (ui.typed.value.trim().length < 2) return notify("נא להזין שם לחתימה", "error"); state.typedReady = true; updateSignatureState(); notify("חתימה מוקלדת נבחרה. אמת/י את ההצהרות לפני יצירת המסמכים.", "good"); });

  function imageBytes() {
    const source = document.createElement("canvas"); source.width = 1100; source.height = 360;
    const ctx = source.getContext("2d");
    if (state.mode === "draw") ctx.drawImage(ui.signCanvas, 50, 20, 1000, 320);
    else { ctx.fillStyle = "#12273e"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "italic 100px cursive"; ctx.fillText(ui.typed.value.trim(), 550, 170, 1040); }
    const img = ctx.getImageData(0, 0, source.width, source.height), a = img.data; let x0 = source.width, y0 = source.height, x1 = -1, y1 = -1;
    for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) { const i = (y * source.width + x) * 4; if (a[i+3] > 12) { x0=Math.min(x,x0); x1=Math.max(x,x1); y0=Math.min(y,y0); y1=Math.max(y,y1); } }
    if (x1 < x0) throw Error("החתימה ריקה");
    const pad = 12, w = Math.min(source.width, x1 - x0 + 1 + pad*2), h = Math.min(source.height, y1 - y0 + 1 + pad*2);
    const cropped = document.createElement("canvas"); cropped.width = w; cropped.height = h;
    cropped.getContext("2d").drawImage(source, Math.max(0,x0-pad), Math.max(0,y0-pad), w, h, 0, 0, w, h);
    const b64 = cropped.toDataURL("image/png").split(",")[1];
    const bin = atob(b64), bytes = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i); return bytes;
  }

  const MAX_DOCS = 10, MAX_BYTES = 35 * 1024 * 1024;
  async function addFiles(files) {
    if (!requireLibs() || state.generating) return;
    const incoming = Array.from(files).filter(f => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (!incoming.length) return notify("נא לבחור קובצי PDF", "error");
    const accepted = incoming.slice(0, Math.max(0, MAX_DOCS - state.docs.length));
    if (incoming.length > accepted.length) notify("אפשר לטעון עד עשרה קבצים יחד", "error");
    for(const file of accepted) {
      if (file.size > MAX_BYTES) { notify(`הקובץ ${file.name} גדול מדי (מקסימום 35MB)`, "error"); continue; }
      try {
        const bytes = await file.arrayBuffer();
        const pdfTask = window.pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)), isEvalSupported: false });
        const pdfView = await pdfTask.promise;
        const firstPage = await pdfView.getPage(1);
        const firstSize = firstPage.getViewport({scale:1});
        const preset = PRESETS.find(p => p.test.test(file.name)) || null;
        let placement = preset && !preset.noPreset && !preset.block && pdfView.numPages >= preset.page ? {page:preset.page,x:preset.x,y:preset.y,w:preset.w,h:preset.h,source:"preset"} : null;
        // A filename alone is not enough. Confirm the applicant-signature wording on
        // the EXPECTED PDF page before trusting an automatic stamp location.
        if (placement) {
          const required = {allianz:/applicant.{0,12}signature/i,vumi:/firma\s+del\s+solicitante\s+principal/i,foyer:/signature\s+of\s+the\s+main\s+applicant/i,img:/policyholder\s+signature/i};
          try {
            const pg=await pdfView.getPage(preset.page);
            const items=await pg.getTextContent();
            const wording=items.items.map(x=>x.str||"").join(" ").replace(/\s+/g," ");
            if(!required[preset.key]?.test(wording))placement=null;
          } catch(e) {placement=null;}
        }
        const doc = { id: `doc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, file, bytes, pdfView, pages:pdfView.numPages, previewPage:placement?placement.page:1, placement,
          datePlacement:null, approved:!!placement, include:!!placement, preset, dimensions:{width:firstSize.width,height:firstSize.height}, error:null, reviewRequired:!!preset?.block };
        state.docs.push(doc);
        // AXA's payment mandate and other excluded PDFs must NEVER be the first
        // document to land users on. Start with the first safe known applicant field.
        if(!state.currentId || (placement && !currentDoc()?.placement))state.currentId=doc.id;
        cleanOutputs(); renderFileList(); updateReady();
      }catch(err){console.error(err);notify(`לא הצלחתי לקרוא את ${file.name}: ${String(err.message||err).slice(0,150)}`, "error");}
    }
    await renderPreview();
    ui.files.value = "";
  }
  ui.files.addEventListener("change", e => addFiles(e.target.files));
  ui.dropzone.addEventListener("keydown", e => { if (e.target === ui.dropzone && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ui.files.click(); } });
  for(const event of ["dragenter", "dragover"]) ui.dropzone.addEventListener(event, e => {e.preventDefault();ui.dropzone.classList.add("dragover");});
  for(const event of ["dragleave", "drop"]) ui.dropzone.addEventListener(event, e => { e.preventDefault(); ui.dropzone.classList.remove("dragover"); if (event === "drop") addFiles(e.dataTransfer.files); });
  ui.demo.addEventListener("click", async () => {
    if(!requireLibs())return;
    const pdf = await window.PDFLib.PDFDocument.create(), page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(window.PDFLib.StandardFonts.Helvetica);
    page.drawText("Signature demonstration — generic example only",{x:64,y:755,font,size:16,color:window.PDFLib.rgb(.12,.19,.26)});
    page.drawText("No personal, medical, or banking data are used.",{x:64,y:720,font,size:11});
    page.drawText("Applicant signature:",{x:65,y:170,font,size:13});
    page.drawRectangle({x:210,y:130,width:260,height:46,borderColor:window.PDFLib.rgb(.47,.6,.59),borderWidth:1});
    const f = new File([await pdf.save()],"signature-demo.pdf",{type:"application/pdf"});
    await addFiles([f]);
    const doc = state.docs.find(d=>d.file===f); if (doc){doc.placement={page:1,x:214,y:670,w:250,h:38,source:"demo"}; doc.include=true;doc.previewPage=1;state.currentId=doc.id;renderFileList();await renderPreview();updateReady();}
  });
  ui.reset.addEventListener("click",async()=>{ if(state.docs.length&&!confirm("לנקות את כל הקבצים, החתימה והמסמכים המוכנים מהדפדפן?"))return;cleanOutputs();for(const d of state.docs){try{await d.pdfView.destroy();}catch(_) {}} state.docs=[];state.currentId=null;state.drawn=false;state.typedReady=false;state.typed.value="";signCtx.clearRect(0,0,ui.signCanvas.width,ui.signCanvas.height);ui.finalConsent.checked=false;ui.list.innerHTML="";renderFileList();await renderPreview();updateSignatureState();notify("הטפסים והחתימה נוקו מזיכרון הדפדפן.","good");});

  function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);}
  function renderFileList(){
    ui.count.textContent=`${state.docs.length} קבצים`;
    ui.list.innerHTML=state.docs.map(d=>{
      const label=d.preset?.block?"לא נכלל · התחלת כיסוי":d.preset?.key==="axa"?"לא נכלל · הרשאת חיוב":d.placement?"✓ מיקום חתימת מבקש זוהה אוטומטית":"לא נכלל אוטומטית · מיקום לא מאומת";
      return `<div class="file-item ${d.id===state.currentId?'selected':''}" data-doc="${esc(d.id)}"><input type="checkbox" class="include-doc" data-id="${esc(d.id)}" ${d.include?'checked':''} ${(d.preset?.block || d.preset?.key==="axa")?'disabled':''} aria-label="כלול ${esc(d.file.name)}"/><div><div class="file-name">${esc(d.file.name)}</div><div class="file-sub">${d.pages} עמודים · ${(d.file.size/1024).toFixed(0)} KB</div><div class="file-status ${d.approved?'ok':''}">${esc(label)}</div></div><button type="button" class="edit-doc" data-id="${esc(d.id)}">בדיקה</button></div>`;
    }).join("");
    ui.current.innerHTML = state.docs.map(d=>`<option value="${esc(d.id)}" ${d.id===state.currentId?'selected':''}>${esc(d.file.name)}</option>`).join("");
    ui.list.querySelectorAll(".edit-doc").forEach(b=>b.addEventListener("click",()=>selectDoc(b.dataset.id)));
    ui.list.querySelectorAll(".include-doc").forEach(b=>b.addEventListener("change",()=>{let d=state.docs.find(x=>x.id===b.dataset.id);if(d){d.include=b.checked;updateReady();}}));
  }
  async function selectDoc(id){ state.currentId=id;state.placementMode="none";updatePositionControls();renderFileList();await renderPreview();}
  ui.current.addEventListener("change",e=>selectDoc(e.target.value));
  function updatePositionControls(){ui.move.classList.toggle("activated",state.placementMode==="signature"); ui.placeDate.classList.toggle("activated",state.placementMode==="date");ui.stage.classList.toggle("placing",state.placementMode!=="none");ui.help.textContent=state.placementMode==="signature"?"לחצ/י על המקום הרצוי לחתימה בתוך עמוד ה-PDF.":state.placementMode==="date"?"לחצ/י על המקום שבו רוצים למקם תאריך; לא מתווסף אוטומטית.":"לשינוי מיקום: בחר/י 'הזז חתימה', ואז לחץ/י על המיקום בעמוד.";}
  function warningFor(d){if(!d)return"";if(d.preset?.block)return"המסמך נראה כמו אישור לתחילת כיסוי/קבלת תנאים. האפליקציה חוסמת חתימה אוטומטית עליו.";if(d.preset?.key==="axa")return"AXA: בעמוד 8 יש חתימה להרשאת Direct Debit בנקאית — חסום לחתימה בכלי. בעמודי הצהרה אחרים אין שדה חתימה מזוהה; יש לבחור מיקום ידנית רק אחרי בדיקת הסעיף.";if(d.preset?.key==="cigna")return"Cigna עשויה לדרוש Adobe Sign הרשמי; תמונה ב-PDF אינה מחליפה אותו.";if(d.placement?.source==="preset")return"";if(!d.placement)return"לא זוהה שדה חתימת מבקש מאומת — הטופס הזה אינו נכלל בהחתמה האוטומטית.";return"";}
  let renderGeneration=0;
  async function renderPreview(){
    const d=currentDoc();ui.previewEmpty.hidden=!!d;ui.previewArea.hidden=!d;if(!d){ui.pdf.width=1;ui.pdf.height=1;ui.stamp.hidden=true;ui.dateStamp.hidden=true;ui.warning.hidden=true;updateReady();return;}
    ui.current.value=d.id;ui.pages.textContent=`${d.previewPage} / ${d.pages}`;
    ui.prev.disabled=d.previewPage<=1;ui.next.disabled=d.previewPage>=d.pages;ui.approve.checked=d.approved;
    const warn=warningFor(d);ui.warning.hidden=!warn;ui.warning.textContent=warn;
    const generation=++renderGeneration;
    try{
      const page=await d.pdfView.getPage(d.previewPage);if(generation!==renderGeneration)return;
      const vw=page.getViewport({scale:1});const width=Math.min(590,Math.max(260,ui.stage.parentElement.clientWidth-35));const scale=width/vw.width;
      const cssViewport=page.getViewport({scale});const dpr=Math.min(window.devicePixelRatio||1,2);const realViewport=page.getViewport({scale:scale*dpr});
      ui.pdf.width=Math.round(realViewport.width);ui.pdf.height=Math.round(realViewport.height);ui.pdf.style.width=`${cssViewport.width}px`;ui.pdf.style.height=`${cssViewport.height}px`;
      ui.stage.style.width=`${cssViewport.width}px`;ui.stage.style.height=`${cssViewport.height}px`;
      const ctx=ui.pdf.getContext("2d");ctx.clearRect(0,0,ui.pdf.width,ui.pdf.height);
      await page.render({canvasContext:ctx,viewport:realViewport}).promise;
      if(generation!==renderGeneration)return;
      d.currentPageDims={width:vw.width,height:vw.height,rotation:page.rotate||0};
      drawOverlay(d);updatePositionControls();
    }catch(err){console.error(err);notify("לא הצלחנו להציג את העמוד: "+String(err.message||err).slice(0,130),"error");}
  }
  function drawOverlay(d){ const dims=d.currentPageDims;if(!dims)return; const rect=(node,p)=>{node.hidden=!p||p.page!==d.previewPage;if(node.hidden)return;node.style.left=(p.x/dims.width*100)+"%";node.style.top=(p.y/dims.height*100)+"%";node.style.width=(p.w/dims.width*100)+"%";node.style.height=(p.h/dims.height*100)+"%";};rect(ui.stamp,d.placement);rect(ui.dateStamp,d.datePlacement); }
  ui.prev.addEventListener("click",async()=>{const d=currentDoc();if(d&&d.previewPage>1){d.previewPage--;await renderPreview();}});
  ui.next.addEventListener("click",async()=>{const d=currentDoc();if(d&&d.previewPage<d.pages){d.previewPage++;await renderPreview();}});
  ui.move.addEventListener("click",()=>{const d=currentDoc();if(!d||d.preset?.block)return notify("לא ניתן לחתום אוטומטית על מסמך קבלת כיסוי", "error");state.placementMode=state.placementMode==="signature"?"none":"signature";updatePositionControls();});
  ui.placeDate.addEventListener("click",()=>{const d=currentDoc();if(!d||d.preset?.block)return notify("המסמך הזה חסום", "error");state.placementMode=state.placementMode==="date"?"none":"date";updatePositionControls();});
  ui.remove.addEventListener("click",()=>{const d=currentDoc();if(d){d.placement=null;d.datePlacement=null;d.approved=false;d.include=false;ui.approve.checked=false;drawOverlay(d);updateReady();renderFileList();}});
  ui.stage.addEventListener("click",e=>{
    const d=currentDoc();if(!d||state.placementMode==="none")return;
    if(d.preset?.block || d.preset?.key === "axa")return notify("טופס זה דורש חתימה בערוץ המבטח, ולא אוטומטית בכלי", "error");
    if(d.preset?.key==="axa")return notify("AXA: זוהתה הרשאת חיוב בנקאי ולכן איננו מאפשרים החתמה אוטומטית של הטופס", "error");
    const dims=d.currentPageDims; if(!dims || dims.rotation!==0)return notify("אין אפשרות למקם חתימה על עמוד מסובב אוטומטית", "error");
    const rect=ui.stage.getBoundingClientRect();const X=(e.clientX-rect.left)/rect.width*dims.width;const Y=(e.clientY-rect.top)/rect.height*dims.height;
    if(X<0||Y<0||X>dims.width||Y>dims.height)return;
    if(state.placementMode==="signature"){
      const w=Math.min(170,dims.width-12), h=Math.min(34,dims.height-12);
      d.placement={page:d.previewPage,x:Math.max(5,Math.min(X-w/2,dims.width-w-5)),y:Math.max(5,Math.min(Y-h/2,dims.height-h-5)),w,h,source:"manual"};d.include=true;d.approved=false;ui.approve.checked=false;
    }else{
      const w=98,h=18;d.datePlacement={page:d.previewPage,x:Math.max(5,Math.min(X-w/2,dims.width-w-5)),y:Math.max(5,Math.min(Y-h/2,dims.height-h-5)),w,h};d.approved=false;ui.approve.checked=false;
    }
    state.placementMode="none";updatePositionControls();drawOverlay(d);renderFileList();updateReady();notify("המיקום עודכן. בדוק/י וסמן/י אישור עבור הטופס.","good");
  });
  ui.approve.addEventListener("change",e=>{const d=currentDoc();if(!d)return; if(e.target.checked&&!d.placement){e.target.checked=false;return notify("ראשית יש לבחור מיקום חתימה", "error");}if(e.target.checked&&(d.preset?.block || d.preset?.key === "axa")){e.target.checked=false;return notify("מסמך זה חסום לחתימה אוטומטית", "error");}d.approved=e.target.checked;renderFileList();updateReady();});
  ui.finalConsent.addEventListener("change",updateReady);
  ui.approveAll.addEventListener("click",async()=>{
    const eligible=state.docs.filter(d=>d.include && d.placement && !d.preset?.block && d.preset?.key!=="axa");
    if(!eligible.length)return notify("אין מסמכים עם שדה חתימת מבקש מזוהה שמוכנים לאישור מרוכז", "error");
    const names=eligible.map(d=>d.file.name.replace(/_MEDICAL_PREFILLED_REVIEW_UNSIGNED\.pdf$/i,"")).join("\n• ");
    if(!confirm(`אישור מרוכז עבור ${eligible.length} טפסים:\n• ${names}\n\nהאם עיינת בכל הטפסים האלו, אימתת שכל הפרטים וההצהרות הרפואיות נכונים, ומאשר/ת להחתים אותם?`))return;
    for(const d of eligible)d.approved=true;
    renderFileList();await renderPreview();updateReady();notify(`${eligible.length} מסמכים אושרו להחתמה לאחר אימותך.`,"good");
  });
  function updateReady(){
    const selected=state.docs.filter(d=>d.include);
    const errors=[]; if(!selected.length)errors.push("יש לבחור לפחות מסמך אחד");if(!signatureIsReady())errors.push("חסרה חתימה");
    if(selected.some(d=>!d.placement||!d.approved||d.preset?.block||d.preset?.key==="axa"))errors.push("יש מסמך שנבחר ללא מיקום חתימה מאומת");
    // No separate consent checkbox: deliberate activation of the clearly-labelled
    // "I confirm accuracy and sign" button is the user's one affirmative act.
    ui.approveAll.disabled=true;
    const okay=!errors.length&&!state.generating;
    ui.generate.disabled=!okay;
    ui.generate.textContent=`אני מאשר/ת את ההצהרות וחותם/ת על ${selected.length} טפסים`;
    ui.ready.textContent=okay?`${selected.length} טפסים נבחרו מראש ומיקום החתימה נקבע אוטומטית.`:errors.length===1 && errors[0]==="חסרה חתימה"?`חתום/י פעם אחת למעלה כדי ליצור ${selected.length} קובצים.`:errors.join(" · ");
  }
  function setProgress(n){ui.progress.hidden=false;ui.fill.style.width=`${Math.min(100,Math.max(0,n))}%`;}
  ui.generate.addEventListener("click", async()=>{
    if(!requireLibs()||state.generating)return;
    const docs=state.docs.filter(d=>d.include);
    // Clicking the explicit "I confirm accuracy and sign" action is the only
    // consolidated authorization; never silently attest to medical facts.
    if(!signatureIsReady()||!docs.length||docs.some(d=>!d.approved||!d.placement||d.preset?.block||d.preset?.key==="axa"))return notify("אין מספיק מסמכים כשירים או חסרה חתימה", "error");
    state.generating=true;updateReady();cleanOutputs();setProgress(1);
    try{
      const png=imageBytes();
      for(let i=0;i<docs.length;i++){
        const d=docs[i], pdf=await window.PDFLib.PDFDocument.load(d.bytes.slice(0),{ignoreEncryption:false});
        const place=d.placement;
        if(!place||place.page>pdf.getPageCount())throw Error(`עמוד חתימה לא נמצא ב-${d.file.name}`);
        if(d.preset?.key==="axa"&&place.page===8)throw Error("ניסיון להחתים הרשאת חיוב חסומה");
        const p=pdf.getPage(place.page-1),sz=p.getSize();
        if(p.getRotation().angle!==0)throw Error("יש צורך בבדיקת כיווניות העמוד לפני החתמה");
        if(place.x<0||place.y<0||place.x+place.w>sz.width+1||place.y+place.h>sz.height+1)throw Error("מיקום חתימה חורג מגבולות העמוד");
        const img=await pdf.embedPng(png);const factor=Math.min(place.w/img.width,place.h/img.height);const w=img.width*factor,h=img.height*factor;
        p.drawImage(img,{x:place.x+(place.w-w)/2,y:sz.height-place.y-(place.h+h)/2,width:w,height:h});
        if(d.datePlacement){const q=d.datePlacement,dp=pdf.getPage(q.page-1),size=dp.getSize();if(q.x>=0&&q.y>=0&&q.x+q.w<=size.width&&q.y+q.h<=size.height){const font=await pdf.embedFont(window.PDFLib.StandardFonts.Helvetica);dp.drawText(ui.signDate.value||"",{x:q.x+2,y:size.height-q.y-13,size:10,font,color:window.PDFLib.rgb(.10,.16,.25)});}}
        const final=await pdf.save({updateFieldAppearances:false});const outputBlob=new Blob([final],{type:"application/pdf"}),url=URL.createObjectURL(outputBlob);
        const base=d.file.name.replace(/\.pdf$/i,"");const name=(base.slice(0,85)||`document-${i+1}`)+"-VISUALLY-SIGNED.pdf";
        state.outputs.push({name,url,size:final.length,blob:outputBlob});setProgress((i+1)/docs.length*100);
      }
      ui.result.innerHTML=state.outputs.map(o=>`<div class="result-item"><strong>${esc(o.name)}</strong><a class="download-link" href="${o.url}" download="${esc(o.name)}">הורד/י PDF חתום בנפרד ↓</a></div>`).join("");
      ui.share.hidden=false;notify(`${state.outputs.length} קבצים מוכנים להורדה או לשיתוף יחד. לא נשלחו למבטחים.`,"good");
    }catch(err){console.error(err);notify("לא הצלחתי ליצור מסמכים חתומים: "+String(err.message||err),"error");cleanOutputs();}
    finally{state.generating=false;ui.progress.hidden=true;updateReady();}
  });

  function keyFromHash() {
    const frag=location.hash.replace(/^#/,"");
    const val=new URLSearchParams(frag).get("key");
    if(!val || !/^[0-9a-f]{64}$/i.test(val))throw Error("כדי לפתוח את הטפסים השתמש/י בקישור האישי עם מפתח הגישה. אין צורך להעלות קבצים.");
    return Uint8Array.from(val.match(/.{2}/g).map(x=>parseInt(x,16)));
  }
  function setBundleStatus(title,detail,tone="loading") {
    ui.bundle.dataset.status=tone;ui.bundleTitle.textContent=title;ui.bundleDetail.textContent=detail;
  }
  async function loadEncryptedBundle(){
    if(!crypto?.subtle || !window.DecompressionStream)throw Error("הדפדפן אינו תומך בפתיחה מאובטחת. השתמש/י ב-Safari/Chrome מעודכנים.");
    const keyBytes=keyFromHash();
    const secretKey=await crypto.subtle.importKey("raw",keyBytes,{name:"AES-GCM"},false,["decrypt"]);
    keyBytes.fill(0);
    const res=await fetch("./data/catalog.json",{cache:"no-store",referrerPolicy:"no-referrer"});
    if(!res.ok)throw Error("לא הצלחנו לטעון את רשימת הטפסים המוצפנים");
    const catalog=await res.json();
    if(catalog.version!==2||catalog.cipher!=="AES-256-GCM")throw Error("גרסת התיק אינה נתמכת");
    const count=catalog.documents.filter(d=>d.src).length;
    let loaded=0;const bad=[];
    for (const d of catalog.documents){
      if(!d.src){bad.push(d.label);continue;}
      setBundleStatus(`מכין טפסים מאובטחים — ${loaded+1}/${count}`,`פותח עכשיו את ${d.label} (לא שולח נתונים לשום שרת)`,"loading");
      try{
        const response=await fetch("./"+d.src,{cache:"force-cache",referrerPolicy:"no-referrer"});
        if(!response.ok)throw Error("Missing encrypted form");
        const bytes=new Uint8Array(await response.arrayBuffer());
        if(bytes.length<30)throw Error("Invalid cipher length");
        const compressed=await crypto.subtle.decrypt({name:"AES-GCM",iv:bytes.subarray(0,12),additionalData:new TextEncoder().encode(d.id)},secretKey,bytes.subarray(12));
        const plain=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
        const magic=new Uint8Array(plain).subarray(0,4);
        if(String.fromCharCode(...magic)!=="%PDF")throw Error("Decrypted content is not PDF");
        const f=new File([plain],d.file,{type:"application/pdf"});
        await addFiles([f]);
        loaded++;
      }catch(err){console.error("Encrypted PDF load failed",d.id,err);bad.push(d.label);}
    }
    setBundleStatus(`${loaded} טפסים נטענו אוטומטית`,bad.length?`לא נטענו: ${bad.join(", ")}. אין צורך להעלות את השאר כדי להחתים את הטפסים שנפתחו.`:"כל המסמכים נפתחו בדפדפן בלבד. אפשר לצייר חתימה פעם אחת.",loaded?"ready":"error");
    if(!loaded)throw Error("אף טופס לא נפתח. בדוק/י את הקישור האישי ונסה/י שוב.");
    notify(`נמצאו ונפתחו ${loaded} טפסי PDF מוצפנים. אין צורך להעלות קבצים.`,"good");
  }
  async function bootSecure() {
    try{
      if(!libsReady())throw Error("ספריות PDF לא נטענו (יש צורך באינטרנט בפתיחה הראשונה)");
      setBundleStatus("מאמת מנוע PDF לפני פענוח מסמכים...","הבדיקה מגנה מפני קוד תצוגה ששונה בדרך.");
      await verifyPdfWorker();
      await loadEncryptedBundle();
    }catch(err){console.error("Secure preloaded forms:",err);setBundleStatus("לא ניתן לפתוח את המסמכים",String(err.message||err),"error");notify(String(err.message||err),"error");}
  }
  ui.share.addEventListener("click",async()=>{
    if(!state.outputs.length)return;
    try{
      const files=state.outputs.map(o=>new File([o.blob],o.name,{type:"application/pdf"}));
      if(navigator.canShare?.({files}) && navigator.share) {
        await navigator.share({title:"טפסים חתומים — לבדיקה ושליחה אישית",text:"קובצי PDF חתומים ויזואלית; עדיין נדרש אישור חברת הביטוח.",files});
      } else {
        notify("הדפדפן שלך לא תומך בשיתוף כמה PDFs במקביל. השתמש/י בכפתורי ההורדה הנפרדים שמתחת.","error");
      }
    }catch(err){if(err.name!=="AbortError")notify("שיתוף הקבצים לא הצליח. אפשר להוריד כל PDF בנפרד.","error");}
  });
  updateSignatureState();renderFileList();renderPreview();
  bootSecure();
})();