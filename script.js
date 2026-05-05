/**
 * 長輩大腦活化練習 - 核心邏輯
 * 1. 10格記憶封頂，之後加速
 * 2. 完整排行榜管理（包含單獨刪除功能）
 * 3. 毫秒級反應速度監控
 */

// --- 全域變數定義 ---
let sequence = [];            // 儲存正確的亮燈順序
let playerSequence = [];      // 儲存玩家按下的順序
let score = 0;                // 累計分數
let difficulty = 'easy';      // 當前難度模式
let isShowing = false;        // 是否正在播放燈號序列
let currentUser = null;       // 當前登錄玩家姓名
let reactionTimes = [];       // 儲存所有點擊的反應時間
let stepStartTime = 0;        // 每一關或每一拍的計時起點
let currentRoundLength = 0;   // 本輪亮燈的數量
let currentSpeed = 0;         // 當前亮燈的持續時間(ms)

// 難度初始設定
const config = {
    easy: { startLen: 3, speed: 1000 },
    medium: { startLen: 5, speed: 750 },
    hard: { startLen: 6, speed: 500 }
};

// --- 初始化網格 ---
const gridContainer = document.getElementById('led-grid');
function initGrid() {
    gridContainer.innerHTML = ''; // 清空
    for (let i = 0; i < 36; i++) {
        const led = document.createElement('div');
        led.className = 'led';
        led.onclick = () => handleInput(i);
        gridContainer.appendChild(led);
    }
}
initGrid();

// --- 介面控制邏輯 ---

/** 切換排行榜側邊欄 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) renderLeaderboard();
}

/** 開啟登錄彈窗 */
function openLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

/** 處理登錄邏輯 */
function handleLogin() {
    const nameInput = document.getElementById('username-input');
    const name = nameInput.value.trim();
    if (!name) {
        alert("請輸入姓名後再開始唷！");
        return;
    }
    currentUser = name;
    document.getElementById('login-trigger').style.display = 'none';
    document.getElementById('user-display').style.display = 'block';
    document.getElementById('display-name').innerText = `目前玩家：${name}`;
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('system-msg').innerText = "登錄成功！請點擊下方開始挑戰。";
}

/** 登出/重置 */
function logout() {
    location.reload();
}

/** 難度按鈕監聽 */
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.onclick = () => {
        if (document.getElementById('start-btn').disabled) return;
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.level;
    };
});

// --- 遊戲運作引擎 ---

/** 開始遊戲主程序 */
async function startGame() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    
    // 重置遊戲狀態
    score = 0;
    reactionTimes = [];
    currentRoundLength = config[difficulty].startLen;
    currentSpeed = config[difficulty].speed;
    
    document.getElementById('score').innerText = "0";
    document.getElementById('reaction').innerText = "0.00";
    document.getElementById('start-btn').disabled = true;
    
    nextRound();
}

/** 進入下一關卡 */
async function nextRound() {
    playerSequence = [];
    sequence = [];
    isShowing = true;
    
    document.getElementById('level').innerText = score + 1;
    document.getElementById('system-msg').innerText = `觀察亮燈順序... (長度: ${currentRoundLength})`;

    // 生成隨機序列
    for (let i = 0; i < currentRoundLength; i++) {
        sequence.push(Math.floor(Math.random() * 36));
    }

    // 播放序列
    const leds = document.querySelectorAll('.led');
    for (let idx of sequence) {
        leds[idx].classList.add('active');
        await new Promise(r => setTimeout(r, currentSpeed));
        leds[idx].classList.remove('active');
        await new Promise(r => setTimeout(r, 200)); // 燈號間隔
    }

    isShowing = false;
    document.getElementById('system-msg').innerText = "換您輸入了！";
    stepStartTime = Date.now(); // 開始計算第一步反應時間
}

/** 處理玩家點擊 */
function handleInput(index) {
    if (isShowing || sequence.length === 0) return;

    const expected = sequence[playerSequence.length];
    
    if (index === expected) {
        // 紀錄反應時間（與上一動或開始時間的差值）
        const now = Date.now();
        reactionTimes.push((now - stepStartTime) / 1000);
        updateReactionDisplay();

        // 點擊視覺反饋
        const leds = document.querySelectorAll('.led');
        leds[index].classList.add('active');
        setTimeout(() => leds[index].classList.remove('active'), 150);
        
        playerSequence.push(index);
        stepStartTime = Date.now(); // 重置下一步的計時起點

        // 是否完成該關所有燈號
        if (playerSequence.length === sequence.length) {
            score++;
            document.getElementById('score').innerText = score;
            
            // 難度增加邏輯：
            if (currentRoundLength < 10) {
                // 1. 未滿10個燈，增加數量
                currentRoundLength++;
            } else {
                // 2. 達到10個燈，長度固定，提升速度 (每次加快10%)
                currentSpeed = Math.max(250, Math.floor(currentSpeed * 0.9));
            }

            document.getElementById('system-msg').innerText = "正確！做得好！";
            setTimeout(nextRound, 1500);
        }
    } else {
        gameOver();
    }
}

/** 更新 UI 上的平均反應時間 */
function updateReactionDisplay() {
    if (reactionTimes.length === 0) return;
    const avg = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    document.getElementById('reaction').innerText = avg.toFixed(3);
}

/** 遊戲結束處理 */
function gameOver() {
    const finalAvg = document.getElementById('reaction').innerText;
    alert(`遊戲結束！\n玩家：${currentUser}\n得分：${score}\n平均速度：${finalAvg} 秒`);
    
    saveRecord(score, finalAvg);
    
    document.getElementById('start-btn').disabled = false;
    document.getElementById('start-btn').innerText = "再試一次";
    document.getElementById('system-msg').innerText = "哎呀，記錯了！沒關係，再練習一次。";
    sequence = [];
}

// --- 資料持久化與排行榜管理 ---

/** 儲存紀錄至 LocalStorage */
function saveRecord(s, r) {
    let records = JSON.parse(localStorage.getItem('elderly_game_db')) || [];
    records.push({ 
        name: currentUser, 
        score: s, 
        reaction: parseFloat(r),
        time: new Date().toLocaleString()
    });
    
    // 排序：分數高優先，分數同則反應快優先
    records.sort((a, b) => b.score - a.score || a.reaction - b.reaction);
    
    // 儲存前 20 筆
    localStorage.setItem('elderly_game_db', JSON.stringify(records.slice(0, 20)));
}

/** 渲染排行榜表格 */
function renderLeaderboard() {
    const records = JSON.parse(localStorage.getItem('elderly_game_db')) || [];
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">尚未有練習紀錄</td></tr>';
        return;
    }

    records.forEach((item, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${item.name}</td>
            <td>${item.score}</td>
            <td>${item.reaction.toFixed(2)}s</td>
            <td>
                <button class="btn-delete" onclick="deleteRecord(${i})">刪除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/** 刪除單筆排行榜紀錄 */
function deleteRecord(index) {
    if (!confirm("確定要刪除這筆紀錄嗎？")) return;

    let records = JSON.parse(localStorage.getItem('elderly_game_db')) || [];
    records.splice(index, 1);
    localStorage.setItem('elderly_game_db', JSON.stringify(records));
    
    renderLeaderboard(); // 刪除後立即刷新
}

// 頁面初次載入執行
window.onload = () => {
    console.log("系統初始化成功");
};