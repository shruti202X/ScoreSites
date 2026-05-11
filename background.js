function getMainDomain(url){
    try{
        return new URL(url).hostname;
    } catch(e){
        console.warn("Invalid URL: ", url);
        return url;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message === "start-tracking"){
        chrome.tabs.query({ active: true, currentWindow: true}, (tabs) => {
            if(tabs.length > 0 && tabs[0].url) {
                let currentSite = getMainDomain(tabs[0].url);
                let currentTime = Date.now()/1_000;

                chrome.storage.local.set({
                    prevSite: currentSite,
                    prevTime: currentTime,
                    trackingEnabled: true
                }, () => {
                    sendResponse({ status: true });
                });
            }
        });
    }else if(message === "stop-tracking"){
        chrome.storage.local.get(["trackingEnabled", "visitedSites", "prevTime", "prevSite", "totalScore"], (result) => {
            let visitedSites = result.visitedSites || {};
            let totalScore = result.totalScore || 0;

            if(result.trackingEnabled && result.prevSite && result.prevTime){
                let prevSite = result.prevSite;
                let time_diff = (Date.now()/1_000) - result.prevTime;
                if(!visitedSites[prevSite]){
                    visitedSites[prevSite] = { time_spent: time_diff, score: 0 };
                }else{
                    visitedSites[prevSite].time_spent += time_diff;
                    let additionalScore = visitedSites[prevSite].score*(time_diff/60);
                    if(additionalScore !== 0){
                        totalScore += additionalScore;
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "images/icon-16.png",
                            title: "Productivity Tracker",
                            message: `Added ${additionalScore} = ${visitedSites[prevSite].score} site score * ${(time_diff/60)} minutes.`
                        });
                    }
                }
            }

            chrome.storage.local.set({
                "trackingEnabled": false,
                "visitedSites": visitedSites,
                "totalScore": totalScore,
                "prevSite": null,
                "prevTime": null,
            }, () => {
                sendResponse({ status: false });
            });
        });
    }else if(message === "export-data"){
        chrome.storage.local.get(["trackingEnabled", "visitedSites", "prevTime", "totalScore", "prevSite"], (result) => {
            let visitedSites = result.visitedSites || {};
            let totalScore = result.totalScore || 0;
            if(result.trackingEnabled && result.porevSite && result.prevTime){
                let prevSite = result.prevSite;
                let time_diff = (Date.now()/1_000) - result.prevTime;
                if(!visitedSites[prevSite]){
                    visitedSites[prevSite] = { time_spent: time_diff, score: 0 };
                }else{
                    visitedSites[prevSite].time_spent += time_diff;
                    totalScore += visitedSites[prevSite].score*(time_diff/60);
                }
            }

            sendResponse({ visitedSites, totalScore });
        });
    }else if(message === "get-status-and-scores"){
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if(tabs.length > 0 && tabs[0].url){
                const domain = getMainDomain(tabs[0].url);
                if(domain === null){
                    chrome.storage.local.get(["trackingEnabled", "totalScore"], (result) => {
                        sendResponse({
                            status: result.trackingEnabled || null,
                            total_score: result.totalScore || null,
                            site_score: "Can't find domain!"
                        });
                    });
                }else{
                    chrome.storage.local.get(["trackingEnabled", "totalScore", "visitedSites"], (result) => {
                        let siteScore = "No visitedSites[domain].score";
                        if(result.visitedSites && result.visitedSites[domain]) siteScore = result.visitedSites[domain].score;
                        sendResponse({
                            status: result.trackingEnabled || null,
                            total_score: result.totalScore || null,
                            site_score: siteScore
                        });
                    });
                }
            }
        });
    }else if(message === "clear-data"){
        chrome.storage.local.get(["trackingEnabled", "visitedSites"], (result) =>{
            let visitedSites = result.visitedSites;
            for(const domain in visitedSites){
                visitedSites[domain].time_spent = 0;
            }
            if(result.trackingEnabled){
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if(tabs.length > 0 && tabs[0].url){
                        currentSite = getMainDomain(tabs[0].url);
                        chrome.storage.local.set({
                            "visitedSites": visitedSites,
                            "totalScore": 0,
                            "prevSite": currentSite,
                            "prevTime": Date.now()/1_000,
                        }, () => {
                            sendResponse({ cleared: true });
                        });
                    }
                });
            }else{
                chrome.storage.local.set({
                    "visitedSites": visitedSites,
                    "totalScore": 0,
                    "prevSite": null,
                    "prevTime": null,
                }, () => {
                    sendResponse({ cleared: true });
                });
            }
        });
    }else if(typeof message === "object" && "type" in message && message.type === "score-update"){
        const newScore = message.value || 0;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if(tabs.length > 0 && tabs[0].url){
                const domain = getMainDomain(tabs[0].url);
                chrome.storage.local.get(["visitedSites"], (result) => {
                    let visitedSites = result.visitedSites || {};
                    if(!visitedSites[domain]){
                        visitedSites[domain] = { score: newScore, time_spent: 0 };
                    }else{
                        visitedSites[domain].score = newScore;
                    }

                    chrome.storage.local.set({ visitedSites }, () => {
                        sendResponse({ site_score: newScore });
                    });
                });
            }
        });
    }

    return true;
});

// Triggers when a url change happens or when on click a link opens a new tab.
chrome.tabs.onUpdated.addListener((tabid, changeInfo, tab) => {
    // TO DO: Use the information of chromes active tab
    // chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if(changeInfo.url){
        chrome.storage.local.get(["trackingEnabled", "visitedSites", "prevTime", "prevSite", "totalScore"], (result) => {
            if(!result.trackingEnabled) return;
            let currentSite = getMainDomain(changeInfo.url);
            //if(result.prevSite && result.prevSite === currentSite) return;
            let visitedSites = result.visitedSites || {};
            let currentTime = Date.now()/1000;
            let totalScore = result.totalScore || 0;

            if(result.prevSite && result.prevTime){
                let prevSite = result.prevSite;
                let time_diff = currentTime - result.prevTime;
                if(!visitedSites[prevSite]){
                    visitedSites[prevSite] = { time_spent: time_diff, score: 0 };
                }else{
                    visitedSites[prevSite].time_spent += time_diff;
                    let additionalScore = visitedSites[prevSite].score*(time_diff/60);
                    if(additionalScore !== -10000){
                        totalScore += additionalScore;
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "images/icon-16.png",
                            title: "Productivity Tracker",
                            message: `Updated: New Site: ${currentSite} Added for ${prevSite}: ${additionalScore} = ${visitedSites[prevSite].score} site score * ${(time_diff/60)} minutes.`
                        });
                    }
                }
            }

            chrome.storage.local.set({
                "visitedSites": visitedSites,
                "totalScore": totalScore,
                "prevSite": currentSite,
                "prevTime": currentTime
            });
        });
    }
});

// Triggers when we switch between tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    let tab = await chrome.tabs.get(activeInfo.tabId);
    if(tab.url){
        chrome.storage.local.get(["trackingEnabled", "visitedSites", "prevTime", "prevSite", "totalScore"], (result) => {
            if(!result.trackingEnabled) return;
            let currentSite = getMainDomain(tab.url);
            //if(result.prevSite && result.prevSite === currentSite) return;
            let visitedSites = result.visitedSites || {};
            let currentTime = Date.now()/1000;
            let totalScore = result.totalScore || 0;

            if(result.prevSite && result.prevTime){
                let prevSite = result.prevSite;
                let time_diff = currentTime - result.prevTime;
                if(!visitedSites[prevSite]){
                    visitedSites[prevSite] = { time_spent: time_diff, score: 0 };
                }else{
                    visitedSites[prevSite].time_spent += time_diff;
                    let additionalScore = visitedSites[prevSite].score*(time_diff/60);
                    if(additionalScore !== -10000){
                        totalScore += additionalScore;
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "images/icon-16.png",
                            title: "Productivity Tracker",
                            message: `Activated: New Site: ${currentSite} Added for ${prevSite}: ${additionalScore} = ${visitedSites[prevSite].score} site score * ${(time_diff/60)} minutes.`
                        });
                    }
                }
            }

            chrome.storage.local.set({
                "visitedSites": visitedSites,
                "totalScore": totalScore,
                "prevSite": currentSite,
                "prevTime": currentTime
            });
        });
    }
});

function millisTill4AM() {
    const now = new Date();
    const next4AM = new Date();
    next4AM.setHours(4, 0, 0, 0);
    if (now >= next4AM) {
        next4AM.setDate(next4AM.getDate() + 1);
    }
    return next4AM.getTime() - now.getTime();
}

function createDailyAlarm() {
    chrome.alarms.get("dailyDelete", (alarm) => {
        if (!alarm) {
            chrome.alarms.create("dailyDelete", {
                when: Date.now() + millisTill4AM(),
                periodInMinutes: 1440
            });
        }
    });
}

chrome.runtime.onInstalled.addListener(createDailyAlarm);
chrome.runtime.onStartup.addListener(createDailyAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyDelete") {
        chrome.storage.local.get(["visitedSites"], (result) =>{
            let visitedSites = result.visitedSites || {};
            const domains = Object.keys(visitedSites);
            for(const domain of domains){
                if (visitedSites[domain].score === 0) {
                    delete visitedSites[domain];
                    continue;
                }
                visitedSites[domain].time_spent = 0;
            }
            chrome.storage.local.set({
                "totalScore": 0,
                "visitedSites": visitedSites,
                "prevSite": null,
                "prevTime": null
            });
        });
    }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    console.log(windowId);
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        chrome.storage.local.set({
            "lostFocusAt": Date.now()
        }, () => {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "images/icon-16.png",
                title: "Productivity Tracker",
                message: `Lost Focus`
            });
        });
    } else {
        chrome.storage.local.get(["prevTime", "lostFocusAt"], (result) => {
            if(result.prevTime !== undefined && result.lostFocusAt !== undefined && result.prevTime && result.lostFocusAt && result.lostFocusAt < result.prevTime){
                let prevTime = result.prevTime + (Date.now() - result.lostFocusAt)/1000;
                chrome.storage.local.set({"prevTime": prevTime, "lostFocusAt": null}, () => {
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "images/icon-16.png",
                        title: "Productivity Tracker",
                        message: `Regained Focus after ${(Date.now() - result.lostFocusAt)/1000} seconds.`
                    })
                });
            }
        });
    }
});

/*
chrome.windows.onRemoved.addListener((windowId) => {
    chrome.notifications.create({
                    type: "basic",
                    iconUrl: "images/icon-16.png",
                    title: "Productivity Tracker",
                    message: `Closed`
                });
    chrome.storage.local.get(["trackingEnabled", "visitedSites", "prevTime", "prevSite", "totalScore"], (result) => {

        if(!result.trackingEnabled || !result.prevSite || !result.prevTime) return;

        let visitedSites = result.visitedSites || {};
        let totalScore = result.totalScore || 0;
        let prevSite = result.prevSite;
        let time_diff = (Date.now()/1_000) - result.prevTime;
        if(!visitedSites[prevSite]){
            visitedSites[prevSite] = { time_spent: time_diff, score: 0 };
        }else{
            visitedSites[prevSite].time_spent += time_diff;
            let additionalScore = visitedSites[prevSite].score*(time_diff/60);
            if(additionalScore !== -10000){
                totalScore += additionalScore;
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "images/icon-16.png",
                    title: "Productivity Tracker",
                    message: `Closed: Added for ${prevSite}: ${additionalScore} = ${visitedSites[prevSite].score} site score * ${(time_diff/60)} minutes.`
                });
            }
        }

        chrome.storage.local.set({
            "visitedSites": visitedSites,
            "totalScore": totalScore,
            "prevSite": null,
            "prevTime": null,
        });
    });
});
*/
