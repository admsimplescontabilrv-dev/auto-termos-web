const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `{templates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className={\`flex items-stretch w-full mb-2 rounded-lg border transition-all \${
                            activeTemplateId === tpl.id
                              ? "bg-slate-800 border-indigo-500 text-slate-200"
                              : "bg-transparent border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                          }\`}
                        >
                          <div className="flex items-center pl-3">
                            <input
                              type="checkbox"
                              checked={batchTemplateIds.includes(tpl.id)}
                              onChange={() => toggleBatchTemplate(tpl.id)}
                              className="w-4 h-4 accent-[#D1A751] cursor-pointer"
                            />
                          </div>
                          <button
                            onClick={() => handleTemplateSelect(tpl.id)}
                            className="flex-1 text-left p-3"
                          >
                            <p className="text-sm font-medium line-clamp-1">
                              {tpl.name}
                            </p>
                            <span className="text-[10px] text-slate-500 tracking-widest mt-1 block">
                              PADRÃO
                            </span>
                          </button>
                        </div>
                      ))}`;

const replacement = `{templates.map((tpl, index) => (
                        <div
                          key={tpl.id}
                          className={\`flex items-stretch w-full mb-2 rounded-lg border transition-all \${
                            activeTemplateId === tpl.id
                              ? "bg-slate-800 border-indigo-500 text-slate-200"
                              : "bg-transparent border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                          }\`}
                        >
                          <div className="flex flex-col justify-center px-1 border-r border-slate-700/50">
                            <button onClick={() => moveTemplate(index, 'up')} className="p-1 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed" disabled={index === 0}>
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button onClick={() => moveTemplate(index, 'down')} className="p-1 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed" disabled={index === templates.length - 1}>
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center pl-3">
                            <input
                              type="checkbox"
                              checked={batchTemplateIds.includes(tpl.id)}
                              onChange={() => toggleBatchTemplate(tpl.id)}
                              className="w-4 h-4 accent-[#D1A751] cursor-pointer"
                            />
                          </div>
                          <button
                            onClick={() => handleTemplateSelect(tpl.id)}
                            className="flex-1 text-left p-3"
                          >
                            <p className="text-sm font-medium">
                              {tpl.name}
                            </p>
                            <span className="text-[10px] text-slate-500 tracking-widest mt-1 block">
                              PADRÃO
                            </span>
                          </button>
                        </div>
                      ))}`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/App.tsx', content);
