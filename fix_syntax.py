with open('src/ChecklistsApp.tsx', 'r') as f:
    content = f.read()

# The incorrect part is:
bad_code = """                            </div>
                          )}
                        </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
              <div className="p-4 border-y border-slate-800 bg-slate-950/50 mt-auto">"""

good_code = """                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <div className="p-4 border-y border-slate-800 bg-slate-950/50 mt-auto">"""

content = content.replace(bad_code, good_code)

bad_code2 = """                            </div>
                          )}
                        </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          </div>
        </div>
      </div>
      </DragDropContext>
      <UnifiedAddModal"""

good_code2 = """                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
          </div>
        </div>
      </div>
      </DragDropContext>
      <UnifiedAddModal"""

content = content.replace(bad_code2, good_code2)

with open('src/ChecklistsApp.tsx', 'w') as f:
    f.write(content)
