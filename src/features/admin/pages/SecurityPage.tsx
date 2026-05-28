import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../../../convex/_generated/api";

export function SecurityPage() {
  const { user }   = useUser();
  const blacklist  = useQuery(api.blacklist.list);
  const addEntry   = useMutation(api.blacklist.add);
  const removeEntry = useMutation(api.blacklist.remove);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSub]      = useState(false);
  const [form, setForm] = useState({ fullName:"", email:"", phone:"", reason:"" });

  const handleAdd = async () => {
    if (!form.reason) return;
    setSub(true);
    try {
      await addEntry({ ...form, fullName:form.fullName||undefined, email:form.email||undefined, phone:form.phone||undefined, addedByClerkId:user?.id??"", addedByName:user?.fullName??"Admin" });
      setShowModal(false);
      setForm({fullName:"",email:"",phone:"",reason:""});
    } finally { setSub(false); }
  };

  return (
    <div className="ad-page">
      <div className="ad-page-head">
        <div>
          <h1 className="ad-title">Security</h1>
          <p className="ad-sub">Manage visitor blacklist and access controls</p>
        </div>
        <button className="ad-primary-btn" onClick={()=>setShowModal(true)}>+ Add to blacklist</button>
      </div>

      <div className="ad-card">
        <div className="ad-card-title" style={{marginBottom:"16px"}}>Visitor blacklist ({blacklist?.length??0})</div>
        {(!blacklist||blacklist.length===0) ? (
          <div className="ad-empty">No entries on the blacklist.</div>
        ) : (
          <table className="ad-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Reason</th><th>Added by</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {blacklist.map((b:any)=>(
                <tr key={b._id}>
                  <td style={{fontWeight:600}}>{b.fullName||"�"}</td>
                  <td style={{color:"#57606a",fontSize:"13px"}}>{b.email||"�"}</td>
                  <td style={{color:"#57606a",fontSize:"13px"}}>{b.phone||"�"}</td>
                  <td style={{color:"#57606a",fontSize:"13px"}}>{b.reason}</td>
                  <td style={{color:"#57606a",fontSize:"12px"}}>{b.addedByName}</td>
                  <td style={{color:"#57606a",fontSize:"12px"}}>{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td><button className="ad-ghost-btn" style={{color:"#cf222e"}} onClick={()=>removeEntry({blacklistId:b._id})}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="ad-overlay" onClick={()=>setShowModal(false)}>
          <div className="ad-modal" onClick={e=>e.stopPropagation()}>
            <div className="ad-modal-head">
              <div className="ad-modal-title">Add to blacklist</div>
              <button className="ad-modal-close" onClick={()=>setShowModal(false)}>?</button>
            </div>
            <div className="ad-modal-body">
              <div className="ad-modal-note" style={{borderColor:"rgba(207,34,46,0.2)",background:"rgba(207,34,46,0.04)",color:"#cf222e"}}>
                Blacklisted visitors will be blocked from checking in.
              </div>
              {[
                {key:"fullName",label:"Full name",     placeholder:"John Doe",          type:"text"},
                {key:"email",   label:"Email address", placeholder:"john@example.com",  type:"email"},
                {key:"phone",   label:"Phone number",  placeholder:"+233 55 000 0000",  type:"tel"},
                {key:"reason",  label:"Reason",        placeholder:"Reason for blocking�",type:"text",req:true},
              ].map(({key,label,placeholder,type,req})=>(
                <div key={key} className="ad-field">
                  <label className="ad-field-label">{label}{req&&<span style={{color:"#cf222e"}}> *</span>}</label>
                  <input className="ad-field-input" type={type} placeholder={placeholder} value={(form as any)[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/>
                </div>
              ))}
            </div>
            <div className="ad-modal-foot">
              <button className="ad-secondary-btn" onClick={()=>setShowModal(false)}>Cancel</button>
              <button style={{padding:"9px 20px",background:"#cf222e",color:"#fff",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",opacity:submitting||!form.reason?0.5:1}} disabled={submitting||!form.reason} onClick={handleAdd}>
                {submitting?"Adding�":"Add to blacklist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default SecurityPage;
