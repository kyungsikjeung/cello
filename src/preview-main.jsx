import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingTemplate } from './App.jsx';
import { resolveTemplateRequest } from './data/template-registry.js';
import { defaultSite } from './data/default-site.js';
import '../styles.css';
import './restaurant.css';

function Preview(){
  const [site,setSite]=useState(() => resolveTemplateRequest(window.location.search).site ?? defaultSite);
  useEffect(()=>{const receive=event=>{if(event.origin===location.origin&&event.data?.type==='LANDING_CMS_PREVIEW')setSite(event.data.site)};addEventListener('message',receive);parent.postMessage({type:'LANDING_CMS_READY'},location.origin);return()=>removeEventListener('message',receive)},[]);
  return <LandingTemplate site={site} preview/>;
}
createRoot(document.getElementById('preview-root')).render(<Preview/>);
