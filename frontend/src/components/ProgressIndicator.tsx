import React from 'react'

export default function ProgressIndicator({ sections, currentSectionIndex, completedSections, sectionsWithErrors, onSectionClick }:{sections:any[], currentSectionIndex:number, completedSections:number[], sectionsWithErrors:number[], onSectionClick:(i:number)=>void}){
  return (
    <div className="d-flex justify-content-between align-items-center mb-3">
      {sections.map((s, i)=>{
        const isCurrent = i===currentSectionIndex
        const completed = completedSections.includes(i)
        const hasError = sectionsWithErrors.includes(i)
        const bg = hasError ? '#ff6b6b' : (isCurrent ? '#00BAED' : (completed ? '#00BAED' : '#e9ecef'))
        const color = (isCurrent || completed) ? '#fff' : '#495057'
        return (
          <div key={s.key} className="text-center" style={{cursor: i<=currentSectionIndex ? 'pointer' : 'default', flex:1}} onClick={()=>{ if(i<=currentSectionIndex) onSectionClick(i)}}>
            <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center" style={{width:36,height:36, background:bg, color, margin:'0 auto'}}>{i+1}</div>
            <div className="d-none d-md-block" style={{fontSize:12, marginTop:6}}>{s.label}</div>
          </div>
        )
      })}
    </div>
  )
}
