const status_ele = document.getElementById("status");
const tot_score_val_ele = document.getElementById("tot-score-val");
const score_val_ele = document.getElementById("score-val");

function update_ui_with_status_and_score(response){
    updateStatus(response);
    updateTotalScore(response);
    updateSiteScore(response);
}

function get_status_and_score(){
    chrome.runtime.sendMessage("get-status-and-scores", update_ui_with_status_and_score);
}

function updateStatus(response){
    if(!response || typeof response.status === "undefined" || response.status === null){
        status_ele.textContent = "Unknown";
        status_ele.style.color = "gray";
        return;
    }
    status_ele.textContent = response.status ? "ON" : "OFF";
    status_ele.style.color = response.status ? "green" : "red";
}

function updateTotalScore(response){
    if(!response || typeof response.total_score === "undefined" || response.total_score === null){
        tot_score_val_ele.textContent = "Unknown";
        return;
    }
    tot_score_val_ele.textContent = `${response.total_score}`
}

function updateSiteScore(response){
    if(!response || typeof response.site_score === "undefined" || response.site_score === null){
        score_val_ele.textContent = "Unknown";
        return;
    }
    score_val_ele.textContent = `${response.site_score}`
}

document.getElementById("refresh").addEventListener("click", () => {
    chrome.runtime.sendMessage("get-status-and-scores", update_ui_with_status_and_score);
});

document.getElementById("start").addEventListener("click", () => {
    chrome.runtime.sendMessage("start-tracking", updateStatus);
});

document.getElementById("stop").addEventListener("click", () => {
    chrome.runtime.sendMessage("stop-tracking", updateStatus);
});

document.getElementById("export").addEventListener("click", () => {
    chrome.runtime.sendMessage("export-data", exportToCsv);
});

document.getElementById("clear").addEventListener("click", () => {
    chrome.runtime.sendMessage("clear-data", (response) => {
        if(response.cleared) alert("History Cleared.\nPlease Refresh.");
    });
});

document.getElementById("score-update").addEventListener("click", () => {
    let scoreValue = parseInt(document.getElementById("score-input").value, 10);
    //alert(`New score of "${scoreValue}" found!`);
    chrome.runtime.sendMessage({ type: "score-update", "value": scoreValue }, updateSiteScore);
});

function exportToCsv(data) {
    if(!data.visitedSites){
        alert("No data to export!");
        return;
    }

    if(!data.totalScore) data.totalScore = 0;

    let csv = "Site,Score,Time(mins),Points\n";
    for(const domain in data.visitedSites){
        try {
            const { time_spent, score } = data.visitedSites[domain];
            csv += `"${domain}","${score}","${(time_spent/60).toFixed(2)}","${((time_spent/60)*score).toFixed(2)}"\n`;
        } catch(e) {
            csv += `"${e}"`;
        }
    }
    let blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `score_sites_${data.totalScore.toFixed(2)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

get_status_and_score()