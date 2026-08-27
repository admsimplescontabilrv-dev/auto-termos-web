const fs = require('fs');
let code = fs.readFileSync('src/CalendarioApp.tsx', 'utf-8');

// I also need padraoId in CalendarioApp.tsx:
// It should be defined before the groupedDayEvents loop, or at the top of the component.
// Let's add padraoId derived from sindicatos at the top of the component body.
code = code.replace(/const \[sindicatos, setSindicatos\] = useState<Sindicato\[\]>\(\[\]\);/g, `const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  const padraoId = sindicatos.find(s => s.nome.toUpperCase().includes('PADRÃO'))?.id;`);

// Then modify the loop:
code = code.replace(/const isSindicatoEvent = \!\!sindicatos\.find\(s => s\.id === group\.empresaId\);[\s\S]*?Via Sindicato<\/div>\n\s*\)}/g, `const isSindicatoEvent = !!sindicatos.find(s => s.id === group.empresaId);
                    const isPadrao = group.empresaId === padraoId;
                    return (
                    <div 
                      key={group.id}
                      onClick={(e) => { e.stopPropagation(); if (group.count === 1) { openEventModal(day, group.events[0]); } else { openDaySummaryModal(day, expandedDayEvents); } }}
                      className={\`text-[10px] sm:text-xs px-2 py-1 rounded border hover:opacity-80 transition-opacity \${getTypeColor(group.type)} flex flex-col\`}
                      title={group.title + (group.count === 1 && group.empresaNome ? \` - \${group.empresaNome}\` : '')}
                    >
                      <div className="font-medium truncate flex justify-between items-center">
                        <span className="truncate">{group.title}</span>
                        {group.count > 1 && (
                          <span className="ml-1 bg-black/20 px-1 rounded-full text-[9px] font-bold shrink-0">{group.count}</span>
                        )}
                      </div>
                      {group.count === 1 && group.empresaNome && <div className="text-[9px] opacity-75 truncate">{group.empresaNome}</div>}
                      {group.count === 1 && isSindicatoEvent && filterEmpresaId !== 'ALL' && !isPadrao && (
                        <div className="text-[8px] font-bold uppercase mt-0.5 bg-black/20 rounded px-1 w-max">Via Sindicato</div>
                      )}
                      {group.count === 1 && isSindicatoEvent && filterEmpresaId !== 'ALL' && isPadrao && (
                        <div className="text-[8px] font-bold uppercase mt-0.5 bg-amber-500/20 text-amber-300 rounded px-1 w-max">Padrão</div>
                      )}`);

// Also need to inject the padraoId events into expandedDayEvents for 'ALL' and specific companies.
// Let's see how expandedDayEvents handles filterEmpresaId.
