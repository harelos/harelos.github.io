
"use strict";
(function () {
  const $ = (id) => document.getElementById(id);
  const state = {docs: [], active: -1, markMode: false, extraMode: false, signatureReady: false, signatureMode: "draw", renderToken: 0, outputs: [], generating: false};
  const MAX_BYTES = 24 * 1024 * 1024;
  const MAX_FILES = 12;
  const pdfLib = () => window.PDFLib;
  const pdfJs = () => window.pdfjsLib;
  const presets = [
    { id:"demo", name:"טופס לדוגמה", re:/^DEMO_Signature_Test/i, pages:1, spot:{page:1,x:105,y:672,w:235,h:47}, date:null },
    { id:"allianz", name:"Allianz Care", re:/ALLIANZ|Care FMU Application/i, pages:16, spot:{page:14,x:38,y:395,w:123,h:51}, date:null },
    { id:"vumi", name:"VUMI", re:/VUMI|Solicitud.*Seguro.*Salud/i, pages:8, spot:{page:7,x:232,y:415,w:135,h:34}, date:null },
    { id:"foyer-ext", name:"Foyer Extensive", re:/FOYER.*EXTENSIVE|Application_Form_T2-4/i, pages:14, spot:{page:14,x:219,y:630,w:157,h:20}, date:{page:14,x:65,y:637,size:9} },
    { id:"foyer-basic", name:"Foyer Basic", re:/FOYER.*BASIC|Application_Form_T1/i, pages:12, spot:{page:12,x:218,y:630,w:157,h:20}, date:{page:12,x:65,y:637,size:9} },
    { id:"img", name:"LUMA / IMG", re:/IMG_LUMA|LUMA_IMG|GPMI Full Medical/i, pages:7, spot:{page:7,x:304,y:580,w:257,h:46}, date:{page:7,x:36,y:550,size:9} },
    { id:"axa", name:"AXA — מיקום חתימה לא מאומת", re:/AXA|GHP Individual FMU/i, pages:10, spot:null, blockedPage:8, warning:"עמוד 8 הוא הרשאה לחיוב בנקאי. אסור לחתום בו. בעמוד 10 יש הצהרה אבל לא זוהתה בו משבצת חתימת מבקש; יש לוודא את המיקום מול הסוכן." }
  ];
  let drawing = false, hasInk = false, currentPdf = null, currentPageNo = 0, viewportScale = 1;
  let ctx = $("signature-pad").getContext("2d");

  function htmlEscape(text) {
    return String(text).replace(/[&<>"']/g, function(c) {return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});
  }
  function toast(message, kind) {
    const box=$("toast"); box.textContent=message;
    box.className="toast show " + (kind||"info");
    clearTimeout(toast._timer);
    toast._timer=setTimeout(function(){box.className="toast";},5000);
  }
  function fmtSize(n) { return (n/1024/1024).toFixed(1)+" MB"; }
  function todayLocal() {
    const d=new Date();
    const n=(v)=>String(v).padStart(2,"0");
    return d.getFullYear()+"-"+n(d.getMonth()+1)+"-"+n(d.getDate());
  }
  $("sign-date").value=todayLocal();
  function dateForPdf() {
    const parts=($("sign-date").value||todayLocal()).split("-");
    return parts.length===3?parts[2]+"/"+parts[1]+"/"+parts[0]:"";
  }
  function cleanupOutputs() {
    state.outputs.forEach(function(o){ URL.revokeObjectURL(o.url); });
    state.outputs=[];
    $("results").innerHTML="";
    $("result-section").hidden=true;
  }
  function resetReview() {
    cleanupOutputs();
    updateCounts();
  }

  function setSignatureMode(mode) {
    state.signatureMode=mode;
    $("mode-draw").classList.toggle("active", mode==="draw");
    $("mode-type").classList.toggle("active", mode==="type");
    $("signature-pad").hidden=mode!=="draw";
    $("typed-wrap").hidden=mode!=="type";
    state.signatureReady = mode==="type" ? ($("typed-name").value.trim().length>1) : hasInk;
    showSignaturePreview();
    resetReview();
  }
  $("mode-draw").onclick=()=>setSignatureMode("draw");
  $("mode-type").onclick=()=>setSignatureMode("type");
  function setupPad() {
    const c=$("signature-pad");
    c.width=940; c.height=235;
    ctx.lineWidth=4; ctx.strokeStyle="#153b58"; ctx.lineJoin="round"; ctx.lineCap="round";
    function point(e) {
      const r=c.getBoundingClientRect();
      return {x:(e.clientX-r.left)*c.width/r.width, y:(e.clientY-r.top)*c.height/r.height};
    }
    c.addEventListener("pointerdown",function(e){
      if(state.signatureMode!=="draw")return;
      e.preventDefault(); c.setPointerCapture(e.pointerId);
      drawing=true;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.2,p.y+.2);ctx.stroke();
      hasInk=true;state.signatureReady=true;showSignaturePreview();resetReview();
    });
    c.addEventListener("pointermove",function(e){
      if(!drawing)return;e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();
    });
    const end=function(){if(!drawing)return;drawing=false;showSignaturePreview();};
    c.addEventListener("pointerup",end);c.addEventListener("pointercancel",end);c.addEventListener("lostpointercapture",end);
    $("clear-signature").onclick=function(){
      ctx.clearRect(0,0,c.width,c.height);hasInk=false;state.signatureReady=false;
      $("typed-name").value="";showSignaturePreview();resetReview();
    };
    $("typed-name").addEventListener("input",function(){
      state.signatureReady=$("typed-name").value.trim().length>1;
      showSignaturePreview();resetReview();
    });
  }
  function signatureDataUrl() {
    if(!state.signatureReady)return null;
    if(state.signatureMode==="type"){
      const t=document.createElement("canvas");t.width=1100;t.height=260;
      const x=t.getContext("2d");
      x.clearRect(0,0,t.width,t.height);x.fillStyle="#153b58";
      x.textAlign="center";x.textBaseline="middle";
      x.font='italic 100px "Brush Script MT", "Segoe Script", cursive';
      x.fillText($("typed-name").value.trim(),t.width/2,t.height/2,t.width-90);
      return cropInk(t);
    }
    return cropInk($("signature-pad"));
  }
  function cropInk(source) {
    const w=source.width,h=source.height;
    const sourceCtx=source.getContext("2d");const img=sourceCtx.getImageData(0,0,w,h);
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y+=1){for(let x=0;x<w;x+=1){
      if(img.data[(y*w+x)*4+3]>35){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    }}
    if(maxX<0)return null;
    const pad=12;const sx=Math.max(0,minX-pad), sy=Math.max(0,minY-pad);
    const cw=Math.min(w-sx,maxX-minX+2*pad), ch=Math.min(h-sy,maxY-minY+2*pad);
    const out=document.createElement("canvas");out.width=cw;out.height=ch;
    out.getContext("2d").drawImage(source,sx,sy,cw,ch,0,0,cw,ch);
    return out.toDataURL("image/png");
  }
  function showSignaturePreview() {
    const el=$("signature-preview");el.innerHTML="";
    const data=signatureDataUrl();
    if(data){const img=document.createElement("img");img.src=data;img.alt="תצוגת החתימה";el.appendChild(img);}
    else el.textContent="החתימה שלך תופיע כאן";
    $("signature-status").textContent=data?"חתימה מוכנה לשימוש חוזר במסמכים שתאשר":"נדרשת חתימה לפני יצירת מסמכים";
    $("signature-status").classList.toggle("ready",!!data);
    updateCounts();
  }
  setupPad();
  setSignatureMode("draw");

  async function prepareFile(file) {
    if(file.size>MAX_BYTES)throw new Error("הקובץ "+file.name+" גדול מ-24 MB");
    if(!/\.pdf$/i.test(file.name))throw new Error("נדרש PDF: "+file.name);
    const bytes=await file.arrayBuffer();
    const pdf=await pdfJs().getDocument({data:new Uint8Array(bytes.slice(0)),useSystemFonts:true}).promise;
    const template=presets.find(t=>t.re.test(file.name));
    const pageCount=pdf.numPages;
    let spot=null,warning="";
    if(template&&template.spot) {
      if(pageCount===template.pages)spot={...template.spot,verified:false};
      else warning="מספר העמודים שונה מהטופס שנבדק ("+template.pages+"). יש למקם חתימה ידנית.";
    }
    if(template&&template.warning)warning=template.warning;
    const obj={id:"doc"+Date.now()+Math.random().toString(16).slice(2),file:file,bytes:bytes,pdf:pdf,pages:pageCount,template:template,spot:spot,additionalSpots:[],date:template?.date||null,manual:false,selected:!!spot,reviewed:false,page:spot?.page||Math.min(pageCount,template?.id==="axa"?10:pageCount),warning:warning};
    if(template?.id==="axa"){obj.selected=false; obj.page=Math.min(pageCount,10);}
    return obj;
  }
  async function addFiles(list) {
    const files=Array.from(list||[]);
    if(files.length===0)return;
    if(!pdfJs()||!pdfLib()){toast("ספריות ה-PDF עדיין נטענות. נסה שוב בעוד רגע.", "error");return;}
    if(state.docs.length+files.length>MAX_FILES){toast("אפשר להוסיף עד 12 מסמכים בכל סבב","error");return;}
    $("load-state").textContent="טוען ומנתח קובצי PDF...";
    let added=0;
    for(const file of files) {
      if(state.docs.some(d=>d.file.name===file.name&&d.file.size===file.size)){continue;}
      try{const d=await prepareFile(file);state.docs.push(d);added++;}
      catch(e){toast("לא ניתן לקרוא "+file.name+": "+(e.message||"שגיאת PDF"),"error");}
    }
    $("load-state").textContent=added?"נקלטו "+added+" קבצים. החתימה והמיקומים עדיין דורשים אישור.":"לא נוספו קבצים חדשים.";
    $("doc-workspace").hidden=state.docs.length===0;
    $("empty-docs").hidden=state.docs.length!==0;
    renderDocList();
    if(state.active<0&&state.docs.length)activateDoc(0);
    else if(state.active>=0)activateDoc(state.active);
    resetReview();
    $("file-input").value="";
  }
  $("file-input").addEventListener("change",e=>addFiles(e.target.files));
  const drop=$("drop-area");
  drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("hover");});
  drop.addEventListener("dragleave",e=>{e.preventDefault();drop.classList.remove("hover");});
  drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("hover");addFiles(e.dataTransfer.files);});
  $("choose-files").onclick=()=>$("file-input").click();
  $("demo-btn").onclick=async function(){
    if(!pdfLib()){toast("הספרייה עדיין נטענת","error");return;}
    const d=await pdfLib().PDFDocument.create();
    const p=d.addPage([595,842]);const font=await d.embedFont(pdfLib().StandardFonts.Helvetica);
    p.drawText("DEMO INSURANCE APPLICATION - NO MEDICAL DATA",{x:48,y:785,size:17,font,color:pdfLib().rgb(.10,.27,.39)});
    p.drawText("Applicant:",{x:50,y:680,size:12,font});
    p.drawText("Demo User",{x:120,y:680,size:12,font});
    p.drawText("Signature of applicant:",{x:50,y:210,size:12,font});
    p.drawRectangle({x:100,y:117,width:235,height:47,borderColor:pdfLib().rgb(.34,.52,.64),borderWidth:1});
    const bytes=await d.save();
    const f=new File([bytes],"DEMO_Signature_Test.pdf",{type:"application/pdf"});
    await addFiles([f]);toast("טופס הדוגמה נטען. אפשר לבדוק את התהליך בלי מידע רפואי.","success");
  };

  function renderDocList() {
    const list=$("doc-list");list.innerHTML="";
    state.docs.forEach((d,i)=>{
      const row=document.createElement("div");
      row.className="doc-row "+(i===state.active?"current":"");
      const status=d.warning?"דורש בדיקה":(d.spot?"מיקום חתימה מוצע":"מיקום חסר");
      row.innerHTML='<div class="doc-info"><div class="doc-name">'+htmlEscape(d.file.name)+'</div><div class="doc-meta">'+d.pages+' עמודים · '+fmtSize(d.file.size)+' · '+htmlEscape(status)+'</div></div><div class="doc-actions"><label class="check-toggle"><input type="checkbox" class="doc-select" '+(d.selected?'checked':'')+' aria-label="כלול את '+htmlEscape(d.file.name)+'"><span>כלול</span></label><button class="mini-btn open-doc" type="button">בדיקה</button><button class="icon-btn remove-doc" type="button" title="הסר קובץ" aria-label="הסר קובץ">×</button></div>';
      row.querySelector(".open-doc").onclick=()=>activateDoc(i);
      row.querySelector(".doc-select").onchange=(e)=>{
        if(e.target.checked&&!d.spot){e.target.checked=false;toast("קודם יש להגדיר מיקום חתימת המבקש במסמך","error");activateDoc(i);return;}
        d.selected=e.target.checked;d.reviewed=false;renderDocList();resetReview();
      };
      row.querySelector(".remove-doc").onclick=()=>{
        const wasActive=state.active===i;
        try{d.pdf.destroy();}catch(e){}
        state.docs.splice(i,1);
        if(state.docs.length===0){state.active=-1;$("doc-workspace").hidden=true;$("empty-docs").hidden=false;}
        else if(wasActive){state.active=-1;activateDoc(Math.max(0,i-1));}
        else if(i<state.active){state.active--;}
        renderDocList();resetReview();
      };
      list.appendChild(row);
    });
    updateCounts();
  }
  function activateDoc(i) {
    if(i<0||i>=state.docs.length)return;
    state.active=i;state.markMode=false;
    $("position-mode").classList.remove("active");
    const d=state.docs[i];
    $("current-title").textContent=d.template?.name||d.file.name;
    $("current-file").textContent=d.file.name;
    $("current-warning").textContent=d.warning||"";
    $("current-warning").hidden=!d.warning;
    $("confirm-doc").checked=!!d.reviewed;
    $("page-count").textContent="מתוך "+d.pages;
    $("current-include").checked=d.selected;
    $("position-mode").textContent="מיקום חדש בקליק על הדף";
    $("position-mode").classList.toggle("warn",d.template?.id==="axa");
    renderDocList();renderPreview();
  }
  $("current-include").onchange=(e)=>{
    const d=state.docs[state.active];if(!d)return;
    if(e.target.checked&&!d.spot){toast("קודם יש לבחור מיקום חתימת מבקש","error");e.target.checked=false;return;}
    d.selected=e.target.checked;d.reviewed=false;$("confirm-doc").checked=false;renderDocList();resetReview();
  };
  $("confirm-doc").onchange=e=>{
    const d=state.docs[state.active];if(!d)return;
    if(e.target.checked&&(!d.spot||!d.selected)){toast("יש לבחור מסמך ומיקום חתימה לפני אישורו","error");e.target.checked=false;return;}
    d.reviewed=e.target.checked;renderDocList();resetReview();
  };
  $("page-prev").onclick=()=>{
    const d=state.docs[state.active];if(!d)return;
    d.page=Math.max(1,d.page-1);renderPreview();
  };
  $("page-next").onclick=()=>{
    const d=state.docs[state.active];if(!d)return;
    d.page=Math.min(d.pages,d.page+1);renderPreview();
  };
  $("position-mode").onclick=function(){
    const d=state.docs[state.active];if(!d)return;
    if(d.template?.id==="axa"){
      const ok=window.confirm("ב-AXA עמוד 8 הוא הוראת חיוב בנקאי ואסור להחתים אותו. לא אותרה משבצת חתימה ייעודית בעמוד ההצהרה. למקם ידנית חתימה רק אם קיבלת הנחיה מהמבטח?");if(!ok)return;
    }
    state.markMode=!state.markMode;
    this.classList.toggle("active",state.markMode);
    this.textContent=state.markMode?"הקש על נקודת חתימה בדף":"מיקום חדש בקליק על הדף";
    $("preview-wrap").classList.toggle("placing",state.markMode);
    toast(state.markMode?"עכשיו הקש על מקום חתימת המבקש בדף.":"מצב מיקום בוטל.","info");
  };
  $("remove-spot").onclick=()=>{
    const d=state.docs[state.active];if(!d)return;d.spot=null;d.selected=false;d.reviewed=false;state.markMode=false;
    $("confirm-doc").checked=false;$("current-include").checked=false;renderDocList();renderPreview();resetReview();
  };
  $("add-extra").onclick=()=>{
    const d=state.docs[state.active];if(!d)return;
    if(!d.spot){toast("קודם יש להגדיר חתימה ראשית","error");return;}
    if(d.template?.id==="axa"){toast("אין להוסיף חתימות אוטומטיות ל-AXA בלי הנחיה על מיקומן","error");return;}
    state.extraMode=true;state.markMode=true;
    $("position-mode").classList.add("active");
    $("preview-wrap").classList.add("placing");
    $("position-mode").textContent="הקש למיקום חתימה נוספת";
    toast("הקש על המיקום הנוסף בדף. חתימה שנייה תתווסף רק לאחר בחירה מפורשת.");
  };
  $("preview-wrap").onclick=function(e){
    if(!state.markMode)return;
    const d=state.docs[state.active];if(!d||!currentPdf)return;
    if(d.template?.blockedPage===d.page) {toast("אסור למקם חתימה בעמוד הרשאת החיוב הבנקאי של AXA!","error");return;}
    const rect=$("preview-wrap").getBoundingClientRect();
    const px=(e.clientX-rect.left)/viewportScale;
    const py=(e.clientY-rect.top)/viewportScale;
    const w=Math.min(185,currentPdf.viewW*.37),h=43;
    const spot={page:d.page,x:Math.max(8,Math.min(currentPdf.viewW-w-8,px-w/2)),y:Math.max(8,Math.min(currentPdf.viewH-h-8,py-h/2)),w:w,h:h,verified:false};
    if(state.extraMode){d.additionalSpots.push(spot);}else{d.spot=spot;}
    d.selected=true;d.reviewed=false;state.markMode=false;state.extraMode=false;
    $("position-mode").classList.remove("active");$("preview-wrap").classList.remove("placing");
    $("current-include").checked=true;$("confirm-doc").checked=false;
    $("position-mode").textContent="מיקום חדש בקליק על הדף";
    renderDocList();renderPreview();resetReview();
  };

  async function renderPreview() {
    const d=state.docs[state.active];if(!d)return;
    const token=++state.renderToken;
    $("page-num").textContent=String(d.page);
    $("page-prev").disabled=d.page===1;$("page-next").disabled=d.page===d.pages;
    $("preview-state").textContent="טוען עמוד...";
    $("preview-wrap").classList.add("rendering");
    try {
      const page=await d.pdf.getPage(d.page);
      if(token!==state.renderToken)return;
      const view=page.getViewport({scale:1,rotation:0});
      const available=Math.max(265,Math.min(820,$("preview-box").clientWidth-28));
      const scale=available/view.width;
      const viewport=page.getViewport({scale,rotation:0});
      viewportScale=scale;
      currentPdf={viewW:view.width,viewH:view.height};
      const canvas=$("pdf-canvas");const ratio=Math.min(2,window.devicePixelRatio||1);
      canvas.width=Math.round(viewport.width*ratio);
      canvas.height=Math.round(viewport.height*ratio);
      canvas.style.width=viewport.width+"px";canvas.style.height=viewport.height+"px";
      $("preview-wrap").style.width=viewport.width+"px";
      $("preview-wrap").style.height=viewport.height+"px";
      const pctx=canvas.getContext("2d",{alpha:false});
      pctx.fillStyle="#fff";pctx.fillRect(0,0,canvas.width,canvas.height);
      await page.render({canvasContext:pctx,viewport:viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]}).promise;
      if(token!==state.renderToken)return;
      drawMarks(d,scale);
      $("preview-state").textContent=d.spot?"המיקום המוצע מסומן בכחול. הקש לשינוי אם צריך.":"אין חתימת מבקש מזוהה. בחר 'מיקום חדש' וסמן ידנית.";
      $("preview-wrap").classList.remove("rendering");
    } catch(e){
      $("preview-state").textContent="תצוגה נכשלה: "+(e.message||"PDF");
      $("preview-wrap").classList.remove("rendering");
      toast("לא ניתן להציג את העמוד; אפשר לנסות מסמך אחר.","error");
    }
  }
  function drawMarks(d,scale) {
    const layer=$("mark-layer");layer.innerHTML="";
    const all=(d.spot?[d.spot]:[]).concat(d.additionalSpots||[]);
    all.filter(m=>m.page===d.page).forEach((m,i)=>{
      const el=document.createElement("div");
      el.className="signature-mark";
      el.style.left=(m.x*scale)+"px";el.style.top=(m.y*scale)+"px";
      el.style.width=(m.w*scale)+"px";el.style.height=(m.h*scale)+"px";
      const sign=signatureDataUrl(); if(sign){const img=document.createElement("img");img.src=sign;img.alt="תצוגה מקדימה";el.appendChild(img);}
      else {el.textContent=i===0?"חתימת המבקש":"חתימה נוספת";}
      layer.appendChild(el);
    });
  }
  function updateCounts() {
    const sel=state.docs.filter(d=>d.selected);
    const good=sel.filter(d=>d.spot&&d.reviewed);
    $("selected-num").textContent=String(sel.length);
    $("reviewed-num").textContent=String(good.length);
    $("total-num").textContent=String(state.docs.length);
    const ready=!!state.signatureReady&&sel.length>0&&sel.length===good.length&&$("final-consent").checked&&!state.generating;
    $("create-signed").disabled=!ready;
    $("ready-explain").textContent=!state.signatureReady?"צייר חתימה אחת או בחר חתימה מוקלדת."
      :!sel.length?"בחר לפחות מסמך אחד שיש בו מקום מאומת לחתימה."
      :good.length!==sel.length?"יש לאשר את נכונות ההצהרות בכל אחד מהמסמכים שנבחרו ("+good.length+"/"+sel.length+")."
      :!$("final-consent").checked?"אשר למטה במפורש את החלת החתימה על המסמכים שבחרת.":"מוכן ליצירת "+sel.length+" קובצי PDF חתומים.";
    $("generate-count").textContent=String(sel.length);
  }
  $("final-consent").addEventListener("change",updateCounts);
  $("sign-date").addEventListener("change",resetReview);
  $("stamp-date").addEventListener("change",resetReview);
  async function makeSigned() {
    if(state.generating)return;updateCounts();
    if($("create-signed").disabled){toast("יש להשלים את אישור הטפסים והחתימה","error");return;}
    const data=signatureDataUrl();if(!data){toast("חתימה חסרה","error");return;}
    cleanupOutputs();
    state.generating=true;updateCounts();
    const list=state.docs.filter(d=>d.selected);
    const date=dateForPdf();
    for(let i=0;i<list.length;i++){
      const d=list[i];
      $("process-status").textContent="מכין "+(i+1)+" מתוך "+list.length+": "+d.file.name;
      try{
        const pd=await pdfLib().PDFDocument.load(d.bytes,{ignoreEncryption:false});
        const sig=await pd.embedPng(data);
        const marks=[d.spot].concat(d.additionalSpots||[]);
        for(const m of marks) {
          if(!m)throw new Error("אין מיקום חתימה");
          if(d.template?.blockedPage===m.page)throw new Error("עמוד זה מכיל הרשאת חיוב ולא ניתן לחתום בו אוטומטית");
          const page=pd.getPage(m.page-1);
          const width=Math.min(m.w,m.h*sig.width/sig.height);
          const height=width*sig.height/sig.width;
          page.drawImage(sig,{x:m.x+(m.w-width)/2,y:page.getHeight()-m.y-m.h+(m.h-height)/2,width:width,height:height});
        }
        if($("stamp-date").checked&&d.date&&d.date.page<=pd.getPageCount()){
          const page=pd.getPage(d.date.page-1);
          const font=await pd.embedFont(pdfLib().StandardFonts.Helvetica);
          page.drawText(date,{x:d.date.x,y:page.getHeight()-d.date.y-10,size:d.date.size||9,font,color:pdfLib().rgb(.07,.17,.26)});
        }
        const bytes=await pd.save({useObjectStreams:false});
        const blob=new Blob([bytes],{type:"application/pdf"});
        const base=d.file.name.replace(/\.pdf$/i,"").replace(/[^a-zA-Z0-9_\-. ]/g,"_");
        state.outputs.push({name:base+"_SIGNED_"+($("sign-date").value||todayLocal())+".pdf",blob,url:URL.createObjectURL(blob),original:d.file.name});
      }catch(e){toast("יצירת PDF נכשלה עבור "+d.file.name+": "+(e.message||"שגיאה"),"error");}
    }
    state.generating=false;$("process-status").textContent="";
    renderResults();updateCounts();
    if(state.outputs.length){$("result-section").hidden=false;$("result-section").scrollIntoView({behavior:"smooth",block:"start"});}
  }
  $("create-signed").onclick=makeSigned;
  function download(o) {
    const a=document.createElement("a");a.href=o.url;a.download=o.name;document.body.appendChild(a);a.click();a.remove();
  }
  function renderResults(){
    const root=$("results");root.innerHTML="";
    state.outputs.forEach((o)=>{
      const row=document.createElement("div");row.className="result-row";
      const name=document.createElement("div");name.className="result-name";name.textContent=o.name;
      const b=document.createElement("button");b.type="button";b.className="btn primary small";b.textContent="הורד PDF";
      b.onclick=()=>download(o);row.appendChild(name);row.appendChild(b);root.appendChild(row);
    });
    $("result-count").textContent=String(state.outputs.length);
    $("combine-all").disabled=state.outputs.length<2;
  }
  $("combine-all").onclick=async()=>{
    if(state.outputs.length<2)return;
    $("combine-all").disabled=true;
    try{
      const merged=await pdfLib().PDFDocument.create();
      for(const o of state.outputs){
        const src=await pdfLib().PDFDocument.load(await o.blob.arrayBuffer());
        const copied=await merged.copyPages(src,src.getPageIndices());
        copied.forEach(p=>merged.addPage(p));
      }
      const blob=new Blob([await merged.save()],{type:"application/pdf"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="ALL_SIGNED_APPLICATIONS_"+($("sign-date").value||todayLocal())+".pdf";a.click();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){toast("מיזוג קבצים נכשל: "+(e.message||"שגיאה"),"error");}
    $("combine-all").disabled=false;
  };
  $("reset-all").onclick=()=>{
    if(!window.confirm("לנקות מהדפדפן את המסמכים ואת החתימה הנוכחית?"))return;
    state.docs.forEach(d=>{try{d.pdf.destroy();}catch(e){}});
    state.docs=[];state.active=-1;hasInk=false;ctx.clearRect(0,0,$("signature-pad").width,$("signature-pad").height);
    $("typed-name").value="";$("final-consent").checked=false;$("doc-list").innerHTML="";
    $("doc-workspace").hidden=true;$("empty-docs").hidden=false;
    $("preview-state").textContent="בחר מסמך";$("preview-wrap").style.width="0";$("mark-layer").innerHTML="";
    $("load-state").textContent="קבצים לא נשמרים באתר. טען PDFים לצורך חתימה.";
    cleanupOutputs();setSignatureMode("draw");toast("המסמכים והחתימה נמחקו מזיכרון הדף.","success");
  };
  window.addEventListener("beforeunload",()=>{state.outputs.forEach(o=>URL.revokeObjectURL(o.url));state.docs.forEach(d=>{try{d.pdf.destroy();}catch(e){}});});
  function initLibStatus(){
    const okay=!!pdfJs()&&!!pdfLib();
    $("lib-check").textContent=okay?"מנוע PDF מוכן · הכל מעובד במכשיר שלך":"ממתין לספריות PDF. דרוש חיבור רשת לטעינה ראשונית.";
    $("lib-check").classList.toggle("ready",okay);
  }
  window.addEventListener("load",initLibStatus);initLibStatus();updateCounts();
})();