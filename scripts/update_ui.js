const fs = require('fs');

const file = 'c:/Users/Harshit Frostrek/Desktop/VEDASHI/Admin-Vedashi/app/dashboard/settings/page.tsx';
const content = fs.readFileSync(file, 'utf8');

const startTag = '                    <div className="space-y-6">';
const endTag = '                        <div className="pt-4 flex justify-end">';

const startIndex = content.indexOf(startTag) + startTag.length;
const endIndex = content.indexOf(endTag);

if (startIndex > startTag.length - 1 && endIndex > -1) {
    const replacement = `
                        {/* ====== ORDERS SECTION AUTOMATION ====== */}
                        <div>
                            <h3 className="text-md font-bold text-gold uppercase tracking-wider mb-4 border-b border-border pb-2">Orders Section Automations</h3>
                            
                            {/* Toggle 1: Auto Confirm */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Auto Confirm Orders</h5>
                                    <p className="text-sm text-text-secondary">Automatically transition orders from Pending to Confirmed if stock requirements are met.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.auto_pending_to_confirmed}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, auto_pending_to_confirmed: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Threshold Settings */}
                            <div className={\`transition-all duration-300 overflow-hidden \${autoSettings.auto_pending_to_confirmed ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}\`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">Baseline Stock Threshold</label>
                                    <p className="text-xs text-text-secondary mb-3">If any variant in the order has stock below this baseline, the order will NOT be auto-confirmed, and you will receive a low-stock alert.</p>
                                    <input
                                        type="number"
                                        min="1"
                                        value={autoSettings.auto_confirm_stock_threshold}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, auto_confirm_stock_threshold: parseInt(e.target.value) || 0 })}
                                        className="w-32 rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20"
                                    />
                                </div>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 2: Shiprocket Auto Create */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Automatic Shiprocket Order Creation</h5>
                                    <p className="text-sm text-text-secondary">Automatically generate a Shiprocket Custom Order when an order becomes Confirmed.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.auto_create_shipment}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, auto_create_shipment: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 3: Background Automation Cron */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Background Automation Watcher</h5>
                                    <p className="text-sm text-text-secondary">Proactively scans for Pending orders and processes them automatically based on thresholds.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.enable_cron_watcher}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, enable_cron_watcher: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Cron Interval Settings */}
                            <div className={\`transition-all duration-300 overflow-hidden \${autoSettings.enable_cron_watcher ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}\`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">Execution Interval</label>
                                            <p className="text-xs text-text-secondary">Frequency of pending order scans.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={autoSettings.cron_interval_minutes}
                                                onChange={(e) => setAutoSettings({ ...autoSettings, cron_interval_minutes: parseInt(e.target.value) || 1 })}
                                                className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                            />
                                            <span className="text-xs text-text-secondary font-medium">Minutes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 4: Dashboard Polling */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Real-time Dashboard Refresh</h5>
                                    <p className="text-sm text-text-secondary">Automatically refreshes the Orders dashboard to show new entries and status changes.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.enable_realtime_polling}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, enable_realtime_polling: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Polling Interval Settings */}
                            <div className={\`transition-all duration-300 overflow-hidden \${autoSettings.enable_realtime_polling ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}\`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">Refresh Frequency</label>
                                            <p className="text-xs text-text-secondary">How often the orders list updates.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="5"
                                                max="300"
                                                value={autoSettings.admin_refresh_interval_seconds}
                                                onChange={(e) => setAutoSettings({ ...autoSettings, admin_refresh_interval_seconds: parseInt(e.target.value) || 30 })}
                                                className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                            />
                                            <span className="text-xs text-text-secondary font-medium">Seconds</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ====== SHIPMENT PAGE AUTOMATION ====== */}
                        <div className="mt-12">
                            <h3 className="text-md font-bold text-gold uppercase tracking-wider mb-4 border-b border-border pb-2">Shipment Page Automations</h3>
                            
                            {/* Toggle 5: Automatic Courier Assigning */}
                            <div className={\`flex items-start justify-between transition-opacity duration-300 \${autoSettings.auto_create_shipment ? 'opacity-100' : 'opacity-50 pointer-events-none'}\`}>
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Automatic Courier Assigning</h5>
                                    <p className="text-sm text-text-secondary">Automatically generate AWB and assign a delivery partner based on your logic when an order goes to Shiprocket.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.auto_assign_courier}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, auto_assign_courier: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Courier Logic Settings */}
                            <div className={\`transition-all duration-300 overflow-hidden \${autoSettings.auto_create_shipment && autoSettings.auto_assign_courier ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}\`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-text-primary mb-1">Courier Selection Logic</label>
                                        <p className="text-xs text-text-secondary mb-3">Determines which delivery partner is automatically chosen.</p>
                                        
                                        <select
                                            value={autoSettings.courier_selection_logic}
                                            onChange={(e) => setAutoSettings({ ...autoSettings, courier_selection_logic: e.target.value })}
                                            className="w-full sm:w-64 rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20"
                                        >
                                            <option value="lowest_price">Select lowest pricing</option>
                                            <option value="recommended">Select Recommended</option>
                                            <option value="fastest">Select Fastest estimated delivery courier</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 6: Background Shipment Watcher */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Background Automation Watcher</h5>
                                    <p className="text-sm text-text-secondary">Proactively scans for unassigned new order/shipment and assign them AWB automatically.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.enable_shipment_cron_watcher}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, enable_shipment_cron_watcher: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Shipment Cron Interval Settings */}
                            <div className={\`transition-all duration-300 overflow-hidden \${autoSettings.enable_shipment_cron_watcher ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}\`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">Execution Interval</label>
                                            <p className="text-xs text-text-secondary">Frequency of unassigned shipment scans.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={autoSettings.shipment_cron_interval_minutes}
                                                onChange={(e) => setAutoSettings({ ...autoSettings, shipment_cron_interval_minutes: parseInt(e.target.value) || 5 })}
                                                className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                            />
                                            <span className="text-xs text-text-secondary font-medium">Minutes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 7: Shipment Dashboard Polling */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Real-time Dashboard Refresh</h5>
                                    <p className="text-sm text-text-secondary">Automatically refreshes the Shipment dashboard to show new entries and status changes.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.enable_shipment_realtime_polling}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, enable_shipment_realtime_polling: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Shipment Polling Interval Settings */}
                            <div className={\`transition-all duration-300 overflow-hidden \${autoSettings.enable_shipment_realtime_polling ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}\`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">Refresh Frequency</label>
                                            <p className="text-xs text-text-secondary">How often the shipment list updates.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="5"
                                                max="300"
                                                value={autoSettings.shipment_refresh_interval_seconds}
                                                onChange={(e) => setAutoSettings({ ...autoSettings, shipment_refresh_interval_seconds: parseInt(e.target.value) || 30 })}
                                                className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                            />
                                            <span className="text-xs text-text-secondary font-medium">Seconds</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
`;

    const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Successfully updated settings UI via script.');
} else {
    console.error('Failed to locate target tags for UI replacement.');
}
