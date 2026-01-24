
import os

target_file = 'src/components/matcher/MatcherWorkspace.tsx'

with open(target_file, 'r') as f:
    lines = f.readlines()

new_lines = []
skip_mode = False
target_loop_started = False

for i, line in enumerate(lines):
    # 1. Update onChange for Result Column
    if "onChange={(e) => updateFileConfig('output', { resultColIdx: parseInt(e.target.value) })}" in line:
        new_lines.append(line.replace(
            "updateFileConfig('output', { resultColIdx: parseInt(e.target.value) })",
            "const idx = parseInt(e.target.value); updateFileConfig('output', { resultColIdx: idx }); scanUniqueValues(idx)"
        ))
        continue
    
    # 2. Replace Target Loop
    if "{targetConfigs.map((tConfig) => {" in line:
        skip_mode = True
        target_loop_started = True
        
        # Insert New UI Loop
        new_lines.append("""                                        {uniqueMatchValues.length > 0 && (
                                            <div className="flex items-center gap-3 py-2">
                                                 <div className="flex-1 h-px bg-border"></div>
                                                 <span className="text-xs text-muted-foreground font-medium">Matched Groups</span>
                                                 <div className="flex-1 h-px bg-border"></div>
                                            </div>
                                        )}
                                        {uniqueMatchValues.map((matchVal) => {
                                            const config = fileGenConfigs[matchVal];
                                            if (!config) return null;

                                            return (
                                                <div key={matchVal} className="p-4 rounded-xl border bg-card/50 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center">
                                                            <Files className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div className="font-medium text-sm flex-1 truncate">{matchVal}</div>
                                                        <Badge variant={config.customerId ? "default" : "outline"} className="text-[10px]">
                                                            {config.customerId ? 'Ready' : 'Incomplete'}
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Customer</label>
                                                            <select
                                                                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm focus:border-primary"
                                                                value={config.customerId || ''}
                                                                onChange={(e) => updateFileConfig(matchVal, { customerId: e.target.value })}
                                                            >
                                                                <option value="">Select Customer...</option>
                                                                {customers.map(c => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Rate 10mm</label>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        className="h-9 px-2 text-right font-mono"
                                                                        placeholder="0.00"
                                                                        value={config.rate10 || ''}
                                                                        onChange={(e) => updateFileConfig(matchVal, { rate10: parseFloat(e.target.value) })}
                                                                    />
                                                                    <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">QAR</span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Rate 20mm</label>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        className="h-9 px-2 text-right font-mono"
                                                                        placeholder="0.00"
                                                                        value={config.rate20 || ''}
                                                                        onChange={(e) => updateFileConfig(matchVal, { rate20: parseFloat(e.target.value) })}
                                                                    />
                                                                    <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">QAR</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
""")
        continue

    if skip_mode:
        # Detect end of loop: "                                        })}" followed by "                                    </div>"
        # Since logic inside is complex, we just look for the closing of map.
        # But wait, lines are iterated sequentially.
        # We need to find the `})}` that matches the map.
        # Hardcoding the indentation helps.
        if line.strip() == "})}" or line.strip() == "});": 
             # Check next line or context?
             # My previous view step 434 showed: 
             # 910:                                         })}
             # 911:                                     </div>
             if "                                        })}" in line:
                 skip_mode = False
                 continue # Skip the closing brace line as we replaced it with our block? 
                 # Wait, our block included the map logic.
                 # Our block ends with `})}` for `uniqueMatchValues.map`.
                 # So we should skip the original closing brace.
        continue

    new_lines.append(line)

with open(target_file, 'w') as f:
    f.writelines(new_lines)
