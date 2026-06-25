import { useState, useEffect, useRef } from "react";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyHnPfElv_DEM8nrJfWwLomJls0Rm58y-aUI9KVU00aCGWNkhTYBr-zAzrDEtRqllw/exec";
const PASSWORD = "Dota1234";
const COMPANY = "Sailfish Swim Academy";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function Badge({ status }) {
  const styles = {
    Pending:  { background:"#FAEEDA", color:"#854F0B" },
    Approved: { background:"#EAF3DE", color:"#3B6D11" },
    Rejected: { background:"#FCEBEB", color:"#A32D2D" },
  };
  const s = styles[status] || { background:"#F1EFE8", color:"#5F5E5A" };
  return (
    <span style={{ ...s, padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:500, display:"inline-block" }}>
      {status}
    </span>
  );
}

function SignatureCanvas({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0C447C";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function stop() {
    drawing.current = false;
    if (onSave) onSave(canvasRef.current.toDataURL());
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    if (onClear) onClear();
  }

  return (
    <div>
      <div style={{ border:"1px dashed #888", borderRadius:8, position:"relative", background:"#FAFAFA", marginBottom:8 }}>
        <canvas
          ref={canvasRef} width={500} height={100}
          style={{ display:"block", width:"100%", height:100, cursor:"crosshair", borderRadius:8 }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
        />
        <span style={{ position:"absolute", bottom:8, right:10, fontSize:11, color:"#aaa", pointerEvents:"none" }}>Sign here</span>
      </div>
      <button onClick={clear} style={{ fontSize:12, color:"#A32D2D", background:"none", border:"none", cursor:"pointer", padding:0 }}>
        Clear signature
      </button>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [tab, setTab] = useState("claims");
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [actionMsg, setActionMsg] = useState("");
  const [sigData, setSigData] = useState(null);
  const [signerName, setSignerName] = useState("Sze Wei");
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [actionLoading, setActionLoading] = useState("");
  const now = new Date();
  const filterYear = now.getFullYear();

  function login() {
    if (pw === PASSWORD) { setAuthed(true); setPwErr(false); }
    else { setPwErr(true); }
  }

  async function fetchClaims() {
    setLoading(true);
    try {
      const r = await fetch(APPS_SCRIPT_URL, {
        method:"POST",
        body: JSON.stringify({ action:"getClaims" }),
        headers:{ "Content-Type":"application/json" }
      });
      const d = await r.json();
      setClaims(d.claims || []);
    } catch(e) { setClaims([]); }
    setLoading(false);
  }

  async function updateStatus(claimId, status, remarks="") {
    setActionLoading(claimId + status);
    try {
      await fetch(APPS_SCRIPT_URL, {
        method:"POST",
        body: JSON.stringify({ action:"updateStatus", claimId, status, approver: signerName, remarks }),
        headers:{ "Content-Type":"application/json" }
      });
      setActionMsg(`Claim ${claimId} ${status.toLowerCase()} successfully.`);
      setTimeout(() => setActionMsg(""), 3000);
      fetchClaims();
    } catch(e) { setActionMsg("Error updating claim."); }
    setActionLoading("");
  }

  useEffect(() => { if (authed) fetchClaims(); }, [authed]);

  const filtered = claims.filter(c => {
    const matchSearch = !search ||
      (c.employeeName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.merchant || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.claimId || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const monthClaims = claims.filter(c => {
    const d = new Date(c.timestamp || c.date || "");
    return d.getMonth() === reportMonth && d.getFullYear() === filterYear;
  });
  const monthApproved = monthClaims.filter(c => c.status === "Approved");
  const monthTotal = monthApproved.reduce((s,c) => s + parseFloat(c.amount||0), 0);
  const pending = claims.filter(c => c.status === "Pending").length;
  const approved = claims.filter(c => c.status === "Approved").length;
  const rejected = claims.filter(c => c.status === "Rejected").length;
  const totalThisMonth = claims.filter(c => {
    const d = new Date(c.timestamp || c.date || "");
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s,c) => s + parseFloat(c.amount||0), 0);

  function exportPDF() {
    const approvedForReport = claims.filter(c => {
      const d = new Date(c.timestamp || c.date || "");
      return c.status === "Approved" && d.getMonth() === reportMonth && d.getFullYear() === filterYear;
    });
    const total = approvedForReport.reduce((s,c) => s + parseFloat(c.amount||0), 0);
    const monthName = MONTHS[reportMonth];
    const rows = approvedForReport.map(c => `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:12px">${c.claimId||""}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:12px">${c.employeeName||""}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:12px">${c.merchant||""}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:12px">${c.category||""}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:right">MYR ${parseFloat(c.amount||0).toFixed(2)}</td>
      </tr>`).join("");
    const sigImg = sigData ? `<img src="${sigData}" style="height:60px;display:block;margin-top:4px" />` : `<div style="height:60px;border-bottom:1px solid #333;margin-top:4px;width:200px"></div>`;
    const html = `
  
  <!DOCTYPE html><html><head>
  
    <meta charset="utf-8">
    <title>Claims Report ${monthName} ${filterYear}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:800px;margin:0 auto}
      h1{font-size:20px;margin-bottom:4px}
      .sub{color:#666;font-size:13px;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#f5f5f5;padding:8px 10px;text-align:left;font-size:12px;border-bottom:2 solid #ddd}
      .total{text-align:right;font-weight:bold;font-size:14px;margin-bottom:32px}
      .sig-section{display:flex;gap:60px;margin-top:40px}
      .sig-block{flex:1}
      .sig-label{font-size:12px;color:#666;margin-top:8px}
      @media print{body{padding:20px}}
    </style>
  </head><body>
    <h1>${COMPANY}</h1>
    <div class="sub">Expense Claims Report â  ${monthName} ${filterYear}</div>
    <p style="font-size:12px;color:#666;margin-bottom:16px">Generated: ${new Date().toLocaleDateString("en-MY",{day:"numeric",month:"long",year:"numeric"})}</p>
    <table>
      <thead><tr><th>Quo ID</th><th>Employee</th><th>Merchant</th><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#999;font-size:13px">No approved claims for this month</td></tr>'}</tbody>
    </table>
    <div class="total">Total approved: MYR ${total.toFixed(2)}</div>
    <div class="sig-section">
      <div class="sig-block">
        ${sigImg}
        <div class="sig-label">Approved by: <strong>${signerName}</strong></div>
        <div class="sig-label">Date: ${new Date().toLocaleDateString("en-MY")}</div>
      </div>
      <div class="sig-block">
        <div style="height:60px;border-bottom:1px solid #333;margin-top:4px;width:200px"></div>
        <div class="sig-label">Received by: </div>
        <div class="sig-label">Date: </div>
      </div>
    </div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`;
    const blob = new Blob([html], {type:"text/html"});
    const url = URL.createObjectURL(bRb);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  if (!authed) return (
    <div style={{ minHeight:"100vh", background:"#F0F4F8", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:16, border:"0.5px solid #ddd", padding:"40px 48px", width:380, textAlign:"center" }}>
        <div style={{ width:48, height:48, borderRadius:12, background:"#E6F1FB", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <svg width="24" height="24" fill="none" stroke="#185FA5" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        </div>
        <h1 style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Claims Manager</h1>
        <p style={{ fontSize:13, color:"#888", marginBottom:24 }}>{COMPANY}</p>
        <input
          type="password" placeholder="Enter password" value={pw}
          onChange={e => { setPw(e.target.value); setPwErr(false); }}
          onKeyDown={e => e.key==="Enter" && login()}
          style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${pwErr?"#E24B4A":"#ddd"}`, borderRadius:8, fontSize:14, marginBottom:8, outline:"none", boxSizing:"border-box" }}
        />
        {pwErr && <p style={{ color:"#E24B4A", fontSize:12, marginBottom:8 }}>Incorrect password</p>}
        <button onClick={login} style={{ width:"100%", padding:"10px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer" }}>
          Sign in
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#F0F4F8", fontFamily:"system-ui,sans-serif", fontSize:14 }}>
      <div style={{ background:"#fff", borderBottom:"0.5px solid #e5e7eb", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"#E6F1FB", display:"vertical-rl", alignItems:"center", justifyContent:"center" }}>
            <svg width="16" height="16" fill="none" stroke="#185FA5" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7 7h10M7 12h4M7 17h4"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </div>
          <span style={{ fontWeight:600, fontSize:15 }}>Sailfish Claims</span>
        </div>
        <div style={{ display:"flex", gap:2 }}>
          {["claims","report"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:"6px 14px", borderRadius:8, border:"none", background: tab===t ? "#EFF6FF" : "transparent", color: tab===t ? "#185FA5" : "#666", fontWeight: tab===t ? 500 : 400, cursor:"pointer", fontSize:13 }}>
              {t === "claims" ? "Claims" : "Monthly report"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, color:"#666" }}>{signerName}</span>
          <div style={{ width:34, height:34, borderRadius:"50%", background:"#E6F1FB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:"#185FA5" }}>
            {signerName.split(" ").map(n => n[0]).join("").slice(0,2)}
          </div>
          <button onClick={() => setAuthed(false)} style={{ fontSize:12, color:"#888", background:"none", border:"none", cursor:"pointer" }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 20px" }}>
        {actionMsg && (
          <div style={{ background:"#EAF3DE", border:"0.5px solid #C0DD97", borderRadius:8, padding:"10px 16px", marginBottom:16, color:"#3B6D11", fontSize:13 }}>
            {actionMsg}
          </div>
        )}

        {tab === "claims" && <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"This month", value:`MYR ${totalThisMonth.toFixed(0)}`, color:"#185FA5" },
              { label:"Pending", value:pending, color:"#854F0B" },
              { label:"Approved", value:approved, color:"#3B6D11" },
              { label:"Rejected", value:rejected, color:"#A32D2D" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff", borderRadius:10, border:"0.5px solid #e5e7eb", padding:"14px 18px" }}>
                <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:600, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background:"#fff", borderRadius:12, border:"0.5px solid #e5e7eb", overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"0.5px solid #e5e7eb", display:"flex", gap:10, alignItems:"center" }}>
              <input placeholder="Search employee, merchant or claim ID..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex:1, padding:"7px 12px", border:"0.5px solid #ddd", borderRadius:8, fontSize:13, outline:"none" }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding:"7px 10px", border:"0.5px solid #ddd", borderRadius:8, fontSize:13 }}>
                {["All","Pending","Approved","Rejected"].map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={fetchClaims} style={{ padding:"7px 14px", border:"0.5px solid #ddd", borderRadius:8, fontSize:13, cursor:"pointer", background:"#fff" }}>
â¹ Refresh
              </button>
            </div>
            {loading ? (
              <div style={{ padding:40, textAlign:"center", color:"#888" }}>Loading claims...</div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F9FAFB" }}>
                    {["Claim ID","Employee","Merchant","Category","Amount","Date","Status","Action"].map(h => (
                      <th key={h} style={{ padding:"9px 14px", textAlign:"left", fontSize:12, fontWeight:500, color:"#666", borderBottom:"0.5px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding:32, textAlign:"center", color:"#aaa", fontSize:13 }}>No claims found</td></tr>
                  ) : filtered.map((c,i) => (
                    <tr key={i} style={{ borderBottom:"0.5px solid #f0f0f0" }}>
                      <td style={{ padding:"11px14px", fontFamily:"monospace", fontSize:11, color:"#888" }}>{cuÎclaimId||"â" }</td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ fontWeight:500 }}>{cËemployeeName||"â"}</div>
                        <div style={{ fontSize:11, color:"#aaa" }}>{c.employeeId} â {c.department}</div>
                      </td>
                      <td style={{ padding:"11px 14px" }}>{c.smerchant||"â" }</td>
                      <td style={{ padding:"11px 14px", color:"#666" }}>{c.category||"â"}</td>
                      <td style={{ padding:"11px 14px", fontWeight:500 }}>MYR {parseFloat(c.amount||0).toFixed(2)}</td>
                      <td style={{ padding:"11px 14px", color:"#888", fontSize:13 }}>{c.date||c.timestamp?.slice(0,10)||"â"}</td>
                      <td style={{ padding:"11px 14px" }}><Badge status={c.status} /></td>
                      <td style={{ padding:"11px 14px" }}>
                        {c.status === "Pending" ? (
                          <div style={{ display:"vertical-rl", gap:6 }}>
                            <button onClick={() => updateStatus(c.claimId,"Approved")}
                              disabled={actionLoading === c.claimId+"Approved"}
                              style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #3B6D11", color:"#3B6D11", background:"transparent", fontSize:12, cursor:"pointer" }}>
                              {actionLoading===c.claimId+"Approved" ? "..." : "â Approve"}
                            </button>
                            <button onClick={() => updateStatus(c.claimId,"Rejected")}
                              disabled={actionLoading === c.claimId+"Rejected"}
                              style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #A32D2D", color:"#A32D2D", background:"transparent", fontSize:12, cursor:"pointer" }}>
                              {actionLoading===c.claimId+"Rejected" ? "..." : "â Reject"}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize:12, color:"#aaa" }}>{c.status} by {c.approver||"â" }</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>}

        {tab === "report" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <div style={{ background:"#fff", borderRadius:12, border:"0.5px solid #e5e7eb", padding:20 }}>
              <h2 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Monthly summary</h2>
              <div style={{ display:"vertical-rl", gap:10, marginBottom:20 }}>
                <select value={reportMonth} onChange={e => setReportMonth(+e.target.value)}
                  style={{ flex:1, padding:"8px 10px", border:"0.5px solid #ddd", borderRadius:8, fontSize:13 }}>
                  {MONTHS.map((m,i) => <option key={i} value={i}>{m} {filterYear}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                {[
                  { label:"Total claims", value:monthClaims.length },
                  { label:"Approved", value:monthApproved.length },
                  { label:"Total approved (MYR)", value:monthTotal.toFixed(2) },
                  { label:"Avg per claim (MYR)", value:monthApproved.length ? (monthTotal/monthApproved.length).toFixed(2) : "0.00" },
                ].map(s => (
                  <div key={s.label} style={{ background:"#F9FAFB", borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:18, fontWeight:600, color:"#185FA5" }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h3 style={{ fontSize:13, fontWeight:500, color:"#666", marginBottom:10 }}>By category</h3>
              {(() => {
                const cats = {};
                monthApproved.forEach(c => { cats[c.category||"Other"] = (cats[c.category||"Other"]||0) + parseFloat(c.amount||0); });
                const total = Object.values(cats).reduce((a,b)=>a+b,0)||1;
                return Object.entries(cats).sort((a,b)=>b.1-a.[1]).map(([cat,amt]) => (
                  <div key={cat} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                      <span>{cat}</span><span style={{ fontWeight:500 }}>MYR {amt.toFixed(2)}</span>
                    </div>
                    <div style={{ height:6, background:"#EFF6FF", borderRadius:4 }}>
                      <div style={{ height:6, background:"#378ADD", borderRadius:4, width:`${(amt/total*100).toFixed(0)}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div style={{ background:"#fff", borderRadius:12, border:"0.5px solid #e5e7eb", padding:20 }}>
              <h2 style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>Export PDF report</h2>
              <p style={{ fontSize:13, color:"#888", marginBottom:16 }}>
                Generates a signed report for {MOTHS[reportMonth]} {filterYear} with all approved claims.
              </p>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:6 }}>Manager name on report</label>
                <input value={signerName} onChange={e => setSignerName(e.target.value)}
                  style={{ width:"100%", padding:"8px 12px", border:"0.5px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:8 }}>Manager signature</label>
                <SignatureCanvas onSave={setSigData} onClear={() => setSigData(null)} />
                {sigData && <div style={{ fontSize:12, color:"#3B6D11", marginTop:4 }}>â Signature captured</div>}
              </div>
              <div style={{ background:"#F9FAFB", borderRadius:8, padding:"12px 14px", marginBottom:16 }}>
                <div style={{ fontSize:12, color:"#666", marginBottom:2 }}>Claims in report</div>
                <div style={{ fontSize:18, fontWeight:600, color:"#185FA5" }}>
                  {monthApproved.length} approved Â Â· MYR {monthTotal.toFixed(2)}
                </div>
              </div>
              <button onClick={exportPDF}
                style={{ width:"100%", padding:"10px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:"middle",marginRight:6}}><path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3"/><path d="M16 6l-4-4-4 4"/></svg>
                Download PDF report
              </button>
              <p style={{ fontSize:11, color:"#aaa", textAlign:"center", marginTop:8 }}>Opens print dialog â save as PDF</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
