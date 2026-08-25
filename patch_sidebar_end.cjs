const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `                          <span className="text-[10px] text-slate-500 tracking-widest mt-1 block">
                            RASCUNHO
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </aside>`;

const replacement = `                          <span className="text-[10px] text-slate-500 tracking-widest mt-1 block">
                            RASCUNHO
                          </span>
                        </button>
                      </div>
                      
                      <h3 className="text-xs text-slate-500 font-semibold tracking-wider mb-3 mt-8">
                        OUTROS DOCUMENTOS (PDF)
                      </h3>
                      <div className="flex items-stretch w-full mb-2 rounded-lg border bg-transparent border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all">
                        <a 
                          href="/CHECKLIST VEICULOS.pdf" 
                          download="CHECKLIST VEICULOS.pdf"
                          className="flex-1 flex items-center justify-between text-left p-3"
                          title="Baixar Checklist Veículos"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              CHECKLIST VEÍCULOS
                            </p>
                            <span className="text-[10px] text-slate-500 tracking-widest mt-1 block">
                              PDF ESTÁTICO
                            </span>
                          </div>
                          <Download className="w-4 h-4 text-indigo-400" />
                        </a>
                      </div>

                    </div>
                  </div>
                </aside>`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/App.tsx', content);
