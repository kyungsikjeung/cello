import { useEffect, useRef } from 'react';

export function LandingTemplate({site}){
  const frame=useRef(null);
  const send=()=>frame.current?.contentWindow?.postMessage({type:'LANDING_CMS_PREVIEW',site},location.origin);
  useEffect(()=>{send()},[site]);
  return <iframe ref={frame} className="cms-preview-frame" src="/preview.html" title="랜딩페이지 실시간 미리보기" onLoad={send}/>;
}
