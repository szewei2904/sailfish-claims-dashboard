import { useState, useEffect, useRef } from "react";


const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyHnPfEIv_DEM8nrJfWwLomJls0Rm58y-aUI9KVU00aCGWNkhTYbBr-zAzrDEtRqllw/exec";
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


export default function App() {h
  return <div>Hello</div>;
}

