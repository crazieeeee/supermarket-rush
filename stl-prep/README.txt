STL Prep · 掃描模型清理網頁
================================

呢個係單檔網頁（index.html），喺瀏覽器開就用得，唔使伺服器。
用途：手機掃完之後，上載 STL / OBJ → 預覽 → 輕度清理 → 下載可打印 STL。

一、手機點掃描（先做）
----------------------
1. 用 Polycam、Scaniverse 或 Kiri Engine 掃描物件。
2. 有 LiDAR 嘅 iPhone Pro：用物件／LiDAR 模式通常最細緻。
3. 冇 LiDAR：慢慢圍住物件影多角度相或短片，光線要均勻。
4. 掃完處理好，匯出 STL 或 OBJ。

二、用呢個網頁
--------------
1. 用瀏覽器開 index.html（或 GitHub Pages 連結）。
2. 拖放／選擇你嘅 .stl 或 .obj。
3. 三維視窗可以拖移旋轉、滾輪縮放。
4. 左邊工具：
   - 置中 Center：移到原點
   - 放平 Lay flat：按包圍盒放平並貼地
   - 等比縮放 Scale：最大邊縮到目標 mm（預設 50）
   - 法線 Normals：重算法線
   - 軟修復 Repair：清零面積三角、合併好近嘅頂點
5. 撳「下載清理後 STL」攞 binary STL。
6. 「還原原檔」可以返去上載時嗰版。

三、重要限制
------------
呢度只做輕度整理。掃描好差、破洞多、非流形，
仍然要用 Meshmixer / Blender 等軟件深修，先至適合打印。

四、技術
--------
- 純前端；檔案唔會上載去任何伺服器
- three.js（CDN）做預覽同 STL/OBJ 讀寫
- 學校筆電用 Chrome / Edge / Safari 都可以

五、GitHub Pages（可選）
------------------------
將成個 stl-prep 資料夾 push 上 GitHub repo，
喺 Settings → Pages 開 branch，就可以用網址分享畀學生。
