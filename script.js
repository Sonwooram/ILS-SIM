// ILS 계기판 니들 요소
const locNeedle = document.getElementById('locNeedle'); // 로컬라이저 (수직선 바늘)
const gpNeedle = document.getElementById('gpNeedle');   // 글라이드패스 (수평선 바늘)

// 로컬라이저 캔버스 요소 및 컨텍스트
const locCanvas = document.getElementById('locCanvas');
const locCtx = locCanvas.getContext('2d');
const locCanvasWidth = locCanvas.width;
const locCanvasHeight = locCanvas.height;

// 글라이드패스 캔버스 요소 및 컨텍스트
const gpCanvas = document.getElementById('gpCanvas');
const gpCtx = gpCanvas.getContext('2d');
const gpCanvasWidth = gpCanvas.width;
const gpCanvasHeight = gpCanvas.height; // Height changed in HTML to 200

// DDM 디스플레이 요소
const locDdmDisplay = document.getElementById('locDdmDisplay');
const gpDdmDisplay = document.getElementById('gpDdmDisplay');

// 제어 버튼 요소
const locZeroBtn = document.getElementById('locZeroBtn');
const locNegWidthBtn = document.getElementById('locNegWidthBtn');
const locPosWidthBtn = document.getElementById('locPosWidthBtn');
const locNeg300Btn = document.getElementById('locNeg300Btn'); // New button
const locPos300Btn = document.getElementById('locPos300Btn'); // New button

const gpZeroBtn = document.getElementById('gpZeroBtn');
const gpNegWidthBtn = document.getElementById('gpNegWidthBtn');
const gpPosWidthBtn = document.getElementById('gpPosWidthBtn');
const gpNeg300Btn = document.getElementById('gpNeg300Btn'); // New button
const gpPos300Btn = document.getElementById('gpPos300Btn'); // New button


// ILS 실제 풀 스케일 DDM 값 (변하지 않음)
const ILS_FULL_SCALE_DDM = 0.155;
// 표시될 최대 DDM 범위 (눈금 및 시뮬레이션 영역 기준)
const MAX_DISPLAY_DDM = 0.300;


// 활주로 및 안테나 기본 설정 (개념적 위치)
// 로컬라이저 캔버스용
const locRunwayWidth = locCanvasWidth * 0.8;
const locRunwayHeight = 20;
const locRunwayX = (locCanvasWidth - locRunwayWidth) / 2;
const locRunwayY = locCanvasHeight * 0.7; // 로컬라이저는 횡방향 움직임이 주가 되므로 세로 중앙에 가깝게

const locAntennaX = locRunwayX + locRunwayWidth / 2;
const locAntennaY = locRunwayY - 50;

// 글라이드패스 캔버스용
const gpRunwayWidth = gpCanvasWidth * 0.8; // GP 캔버스에서는 활주로 너비가 높이로 사용됨
const gpRunwayHeight = 20; // 실제 활주로 폭 (좁게 표현)
const gpRunwayX = gpCanvasWidth / 2 - gpRunwayHeight / 2; // GP 캔버스에서 활주로는 수직으로 보임
// --- 이 부분 수정: GP 캔버스 높이 200에 맞춰 조정 ---
const gpRunwayY = gpCanvasHeight * 0.8; // GP 캔버스 활주로 시작점 Y (200px 기준 160px)

const gpAntennaX = gpRunwayX + gpRunwayHeight / 2; // GP 캔버스에서 안테나는 활주로 옆 (X좌표)
// --- 이 부분 수정: GP 캔버스 높이 200에 맞춰 조정 ---
const gpAntennaY = gpCanvasHeight * 0.5; // GP 캔버스에서 안테나는 활주로 중간 높이 (200px 기준 100px)

// 항공기 초기 위치 및 크기
let locAircraftX = locCanvasWidth / 2;
let locAircraftY = locCanvasHeight * 0.4;
let gpAircraftX = gpCanvasWidth * 0.5; // GP 캔버스에서 항공기는 활주로와 멀리 떨어진 위치 (좌측)
// --- 이 부분 수정: GP 캔버스 높이 200에 맞춰 조정 ---
let gpAircraftY = gpCanvasHeight * 0.2; // GP 캔버스에서 항공기는 상단 (높은 고도) (200px 기준 40px)
const aircraftWidth = 20;
const aircraftHeight = 15;

// 드래그 상태 관리 변수
let isDraggingLoc = false;
let isDraggingGp = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// 기준선 시각적 오프셋 (픽셀)
// 이 값들은 이제 MAX_DISPLAY_DDM에 비례하여 캔버스 끝까지 뻗어나가도록 계산됩니다.
const LOC_COURSE_FULL_SCALE_DEVIATION_PX = (locCanvasWidth / 2) * (ILS_FULL_SCALE_DDM / MAX_DISPLAY_DDM); 
const GP_PATH_FULL_SCALE_DEVIATION_PX = (gpCanvasHeight / 2) * (ILS_FULL_SCALE_DDM / MAX_DISPLAY_DDM);


// 권고 강하 각도 (예: 3도) - 라디안으로 변환
const GLIDE_SLOPE_ANGLE_RAD = (3 * Math.PI) / 180;

// --- DDM 계산 함수 ---

/**
 * 로컬라이저 DDM 값을 계산합니다.
 * @param {number} aircraftX 항공기 X 좌표 (locCanvas 기준)
 * @returns {number} DDM 값
 */
function calculateLocDdm(aircraftX) {
    const lateralPosition = aircraftX - (locRunwayX + locRunwayWidth / 2); // 활주로 중심선으로부터의 편차
    // DDM은 항공기 위치와 실제 ILS 풀 스케일 DDM (0.155) 사이의 관계를 나타냅니다.
    // 캔버스 상의 전체 가시 범위 (locCanvasWidth / 2)를 MAX_DISPLAY_DDM에 매핑합니다.
    const ddm = (lateralPosition / (locCanvasWidth / 2)) * MAX_DISPLAY_DDM;
    return Math.max(-MAX_DISPLAY_DDM, Math.min(MAX_DISPLAY_DDM, ddm)); // 표시 범위로 제한
}

/**
 * 글라이드패스 DDM 값을 계산합니다.
 * @param {number} aircraftY 항공기 Y 좌표 (gpCanvas 기준)
 * @returns {number} DDM 값
 */
function calculateGpDdm(aircraftY) {
    const horizontalDistanceToGp = Math.abs(gpAircraftX - gpAntennaX); // gpAircraftX는 고정된 값
    const idealYAtAircraftX = gpAntennaY - (gpAntennaX - gpAircraftX) * Math.tan(GLIDE_SLOPE_ANGLE_RAD);
    const verticalDeviation = aircraftY - idealYAtAircraftX;
    
    // 캔버스 상의 전체 가시 범위 (gpCanvasHeight / 2)를 MAX_DISPLAY_DDM에 매핑합니다.
    const ddm = (verticalDeviation / (gpCanvasHeight / 2)) * MAX_DISPLAY_DDM;
    return Math.max(-MAX_DISPLAY_DDM, Math.min(MAX_DISPLAY_DDM, ddm)); // 표시 범위로 제한
}


// --- ILS 계기판 업데이트 함수 ---

/**
 * 통합 ILS 계기판의 니들을 업데이트합니다.
 * @param {number} locDdmValue 로컬라이저 DDM 값
 * @param {number} gpDdmValue 글라이드패스 DDM 값
 */
function updateIlsInstrument(locDdmValue, gpDdmValue) {
    const displayAreaSize = 160; // .ils-display-area의 width/height (CSS와 동일)
    const needleCenterPx = displayAreaSize / 2; // 계기판 중앙 픽셀 (80px)
    const fullScaleRangePx = 65; // 바늘이 움직일 수 있는 최대 범위 (중앙으로부터 65px)

    // 로컬라이저 (수직선 니들) 위치 계산 - 좌우 이동 (반전)
    // DDM 값을 MAX_DISPLAY_DDM 기준으로 정규화하여 바늘 위치 계산
    const locNeedlePositionRatio = -locDdmValue / MAX_DISPLAY_DDM; 
    let locNeedleOffsetPx = locNeedlePositionRatio * fullScaleRangePx;
    const newLocNeedleLeft = needleCenterPx + locNeedleOffsetPx;
    locNeedle.style.left = `${newLocNeedleLeft}px`;

    // 글라이드패스 (수평선 니들) 위치 계산 - 위아래 이동 (반전)
    // DDM 값을 MAX_DISPLAY_DDM 기준으로 정규화하여 바늘 위치 계산
    const gpNeedlePositionRatio = -gpDdmValue / MAX_DISPLAY_DDM;
    let gpNeedleOffsetPx = gpNeedlePositionRatio * fullScaleRangePx;
    const newGpNeedleTop = needleCenterPx + gpNeedleOffsetPx;
    gpNeedle.style.top = `${newGpNeedleTop}px`;
}


// --- 항공기 그리기 함수 ---

/**
 * 항공기를 그립니다.
 * @param {CanvasRenderingContext2D} ctx 대상 캔버스 컨텍스트
 * @param {number} x 중심 X 좌표
 * @param {number} y 중심 Y 좌표
 * @param {number} width 폭
 * @param {number} height 높이
 * @param {string} color 항공기 색상
 */
function drawAircraft(ctx, x, y, width, height, color = '#66bb6a') { // Default to green
    ctx.fillStyle = color;
    ctx.beginPath();
    // 몸통 (삼각형)
    ctx.moveTo(x - width / 2, y + height / 2); // 좌하단
    ctx.lineTo(x + width / 2, y + height / 2); // 우하단
    ctx.lineTo(x, y - height / 2);            // 상단 (코 부분)
    ctx.closePath();
    // 왼쪽 날개
    ctx.moveTo(x - width / 2, y);
    ctx.lineTo(x - width / 2 - width / 3, y - height / 4);
    ctx.lineTo(x - width / 2 - width / 3, y + height / 4);
    ctx.closePath();
    // 오른쪽 날개
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2 + width / 3, y - height / 4);
    ctx.lineTo(x + width / 2 + width / 3, y + height / 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#333'; // Darker stroke for better contrast
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// --- 캔버스별 그리기 함수 ---

/**
 * 로컬라이저 캔버스에 내용을 그립니다.
 */
function drawLocCanvas() {
    locCtx.clearRect(0, 0, locCanvasWidth, locCanvasHeight);
    locCtx.imageSmoothingEnabled = true; // For smoother lines

    // 활주로 그리기
    locCtx.fillStyle = '#455a64'; // Darker grey for runway
    locCtx.fillRect(locRunwayX, locRunwayY, locRunwayWidth, locRunwayHeight);
    
    // 활주로 중심선
    locCtx.strokeStyle = '#e0e0e0'; // Lighter white
    locCtx.setLineDash([8, 8]); // Slightly adjusted dash
    locCtx.lineWidth = 2;
    locCtx.beginPath();
    locCtx.moveTo(locRunwayX + locRunwayWidth / 2, 0);
    locCtx.lineTo(locRunwayX + locRunwayWidth / 2, locCanvasHeight);
    locCtx.stroke();
    locCtx.setLineDash([]);

    // 로컬라이저 코스 폭 영역 (0.155 DDM)
    // 풀 스케일 DDM (0.155)에 해당하는 캔버스 상의 픽셀 위치 계산
    const locFullScaleDeviationPx = (locCanvasWidth / 2) * (ILS_FULL_SCALE_DDM / MAX_DISPLAY_DDM);
    locCtx.fillStyle = 'rgba(0, 188, 212, 0.08)'; // Cyan translucent fill
    locCtx.fillRect(locRunwayX + locRunwayWidth / 2 - locFullScaleDeviationPx, 0,
                    locFullScaleDeviationPx * 2, locCanvasHeight);
    
    // 코스 폭 경계선 (0.155 DDM)
    locCtx.strokeStyle = 'rgba(0, 188, 212, 0.4)'; // Cyan translucent stroke
    locCtx.lineWidth = 1.5;
    locCtx.setLineDash([4, 4]);
    locCtx.beginPath();
    locCtx.moveTo(locRunwayX + locRunwayWidth / 2 - locFullScaleDeviationPx, 0);
    locCtx.lineTo(locRunwayX + locRunwayWidth / 2 - locFullScaleDeviationPx, locCanvasHeight);
    locCtx.moveTo(locRunwayX + locRunwayWidth / 2 + locFullScaleDeviationPx, 0);
    locCtx.lineTo(locRunwayX + locRunwayWidth / 2 + locFullScaleDeviationPx, locCanvasHeight);
    locCtx.stroke();
    locCtx.setLineDash([]);

    // DDM 눈금 추가 (로컬라이저 캔버스)
    locCtx.strokeStyle = '#b0bec5'; // 눈금 색상
    locCtx.fillStyle = '#b0bec5';   // 텍스트 색상
    locCtx.font = '10px Arial';
    locCtx.textAlign = 'center';
    locCtx.textBaseline = 'top';

    const locCenterlineX = locRunwayX + locRunwayWidth / 2;
    const locCanvasHalfWidth = locCanvasWidth / 2;
    const numTicks = 6; // 0.300 / 0.050 = 6 (중앙 0포함)

    for (let i = -numTicks; i <= numTicks; i++) {
        // DDM 값을 픽셀 위치로 변환: (DDM 값 / MAX_DISPLAY_DDM) * 캔버스 절반 너비
        const ddmValue = (MAX_DISPLAY_DDM / numTicks) * i;
        const tickX = locCenterlineX + (ddmValue / MAX_DISPLAY_DDM) * locCanvasHalfWidth;
        
        const tickHeight = (i === 0) ? 12 : 8; // 중앙은 길게, 나머지는 짧게

        locCtx.beginPath();
        locCtx.moveTo(tickX, locRunwayY + locRunwayHeight);
        locCtx.lineTo(tickX, locRunwayY + locRunwayHeight + tickHeight);
        locCtx.stroke();
        
        // DDM 값 텍스트
        locCtx.fillText(ddmValue.toFixed(3), tickX, locRunwayY + locRunwayHeight + tickHeight + 2);
    }

    // 로컬라이저 안테나 그리기 (LOC 캔버스에도 표시)
    locCtx.fillStyle = '#ff5722'; // Orange accent
    locCtx.beginPath();
    locCtx.arc(locAntennaX, locAntennaY, 6, 0, Math.PI * 2); // Slightly larger dot
    locCtx.fill();
    locCtx.fillStyle = '#e0e6e9'; // Lighter text color
    locCtx.font = '10px Arial';
    locCtx.fillText('LOC TX', locAntennaX - 18, locAntennaY - 12);

    // 항공기 그리기
    drawAircraft(locCtx, locAircraftX, locAircraftY, aircraftWidth, aircraftHeight, '#66bb6a'); // Green aircraft
}

/**
 * 글라이드패스 캔버스에 내용을 그립니다.
 */
function drawGpCanvas() {
    gpCtx.clearRect(0, 0, gpCanvasWidth, gpCanvasHeight);
    gpCtx.imageSmoothingEnabled = true; // For smoother lines

    // 활주로 그리기 (세로로 그려짐)
    gpCtx.fillStyle = '#455a64';
    gpCtx.fillRect(gpRunwayX, gpRunwayY, gpRunwayHeight, gpCanvasHeight - gpRunwayY);
    
    // GP 안테나 그리기 (GP 캔버스에도 표시)
    gpCtx.fillStyle = '#7e57c2'; // Purple accent
    gpCtx.beginPath();
    gpCtx.arc(gpAntennaX, gpAntennaY, 6, 0, Math.PI * 2); // Slightly larger dot
    gpCtx.fill();
    gpCtx.fillStyle = '#e0e6e9';
    gpCtx.font = '10px Arial';
    gpCtx.fillText('GP TX', gpAntennaX + 10, gpAntennaY);

    // 3도 활공각 기준선 (캔버스 중앙 Y 기준)
    gpCtx.strokeStyle = '#00bcd4'; // Cyan for main path
    gpCtx.lineWidth = 2.5; // Slightly thicker
    gpCtx.setLineDash([8, 8]);
    gpCtx.beginPath();
    const startX_gpPath = gpAntennaX;
    const startY_gpPath = gpAntennaY;
    const endX_gpPath = 0;
    // Y축은 위로 갈수록 값이 작아지므로, tan(각도)를 빼줍니다.
    const endY_gpPath = startY_gpPath - (startX_gpPath - endX_gpPath) * Math.tan(GLIDE_SLOPE_ANGLE_RAD);
    gpCtx.moveTo(startX_gpPath, startY_gpPath);
    gpCtx.lineTo(endX_gpPath, endY_gpPath);
    gpCtx.stroke();
    gpCtx.setLineDash([]);

    // 글라이드패스 패스 폭 영역 (0.155 DDM)
    // 풀 스케일 DDM (0.155)에 해당하는 캔버스 상의 픽셀 높이 계산
    const gpFullScaleDeviationPx = (gpCanvasHeight / 2) * (ILS_FULL_SCALE_DDM / MAX_DISPLAY_DDM);
    gpCtx.fillStyle = 'rgba(129, 212, 250, 0.08)'; // Light blue translucent fill
    gpCtx.beginPath();
    
    // Y = idealY - (X_offset * tan(angle))
    // 상단 경계선: idealY - gpFullScaleDeviationPx
    const topY_gpAntenna = gpAntennaY - gpFullScaleDeviationPx;
    const topY_at_left = gpAntennaY - (gpAntennaX * Math.tan(GLIDE_SLOPE_ANGLE_RAD)) - gpFullScaleDeviationPx;

    // 하단 경계선: idealY + gpFullScaleDeviationPx
    const bottomY_gpAntenna = gpAntennaY + gpFullScaleDeviationPx;
    const bottomY_at_left = gpAntennaY - (gpAntennaX * Math.tan(GLIDE_SLOPE_ANGLE_RAD)) + gpFullScaleDeviationPx;

    gpCtx.moveTo(gpAntennaX, topY_gpAntenna);
    gpCtx.lineTo(0, topY_at_left);
    gpCtx.lineTo(0, bottomY_at_left);
    gpCtx.lineTo(gpAntennaX, bottomY_gpAntenna);
    gpCtx.closePath();
    gpCtx.fill();

    // 패스 폭 경계선
    gpCtx.strokeStyle = 'rgba(129, 212, 250, 0.4)'; // Light blue translucent stroke
    gpCtx.lineWidth = 1.5;
    gpCtx.setLineDash([4, 4]);

    gpCtx.beginPath();
    gpCtx.moveTo(gpAntennaX, topY_gpAntenna);
    gpCtx.lineTo(0, topY_at_left);
    gpCtx.stroke();

    gpCtx.beginPath();
    gpCtx.moveTo(gpAntennaX, bottomY_gpAntenna);
    gpCtx.lineTo(0, bottomY_at_left);
    gpCtx.stroke();
    gpCtx.setLineDash([]);

    // DDM 눈금 추가 (글라이드패스 캔버스)
    gpCtx.strokeStyle = '#b0bec5'; // 눈금 색상
    gpCtx.fillStyle = '#b0bec5';   // 텍스트 색상
    gpCtx.font = '10px Arial';
    gpCtx.textAlign = 'left';
    gpCtx.textBaseline = 'middle';

    const gpCenterlineY_at_zero_x = gpAntennaY - (gpAntennaX * Math.tan(GLIDE_SLOPE_ANGLE_RAD)); 
    const gpCanvasHalfHeight = gpCanvasHeight / 2;
    const numTicks = 6; // 0.300 / 0.050 = 6 (중앙 0 포함)

    for (let i = -numTicks; i <= numTicks; i++) {
        // DDM 값을 픽셀 위치로 변환: (DDM 값 / MAX_DISPLAY_DDM) * 캔버스 절반 높이
        // Y축은 위로 갈수록 값이 작아지므로 DDM 값에 음수를 곱하여 매핑
        const ddmValue = (MAX_DISPLAY_DDM / numTicks) * i;
        const tickY = gpCenterlineY_at_zero_x - (ddmValue / MAX_DISPLAY_DDM) * gpCanvasHalfHeight;
        
        const tickLength = (i === 0) ? 12 : 8; // 중앙은 길게, 나머지는 짧게

        gpCtx.beginPath();
        gpCtx.moveTo(0, tickY); // 캔버스 왼쪽 끝에서 시작
        gpCtx.lineTo(tickLength, tickY); // 오른쪽으로 눈금
        gpCtx.stroke();
        
        // DDM 값 텍스트
        if (i !== 0) {
            gpCtx.fillText(ddmValue.toFixed(3), tickLength + 2, tickY);
        }
    }
    // 0.000 라벨 추가 (중앙)
    gpCtx.fillText('0.000', 12 + 2, gpCenterlineY_at_zero_x);

    // 항공기 그리기
    drawAircraft(gpCtx, gpAircraftX, gpAircraftY, aircraftWidth, aircraftHeight, '#66bb6a'); // Green aircraft
}


// --- 마우스 이벤트 핸들러 ---

/**
 * 마우스 좌표가 항공기 영역 내에 있는지 확인합니다.
 * @param {CanvasRenderingContext2D} ctx 대상 캔버스 컨텍스트
 * @param {number} aircraftX 항공기 X 좌표
 * @param {number} aircraftY 항공기 Y 좌표
 * @param {number} mouseX 마우스 X 좌표
 * @param {number} mouseY 마우스 Y 좌표
 * @returns {boolean}
 */
function isAircraftClicked(ctx, aircraftX, aircraftY, mouseX, mouseY) {
    // 항공기 몸통 영역을 기준으로 클릭 감지
    return mouseX > aircraftX - aircraftWidth / 2 &&
           mouseX < aircraftX + aircraftWidth / 2 &&
           mouseY > aircraftY - aircraftHeight / 2 &&
           mouseY < aircraftY + aircraftHeight / 2;
}

/**
 * 로컬라이저 캔버스 마우스 다운 이벤트 핸들러
 */
function handleLocMouseDown(e) {
    const rect = locCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isAircraftClicked(locCtx, locAircraftX, locAircraftY, mouseX, mouseY)) {
        isDraggingLoc = true;
        dragOffsetX = mouseX - locAircraftX;
        dragOffsetY = mouseY - locAircraftY;
        locCanvas.style.cursor = 'grabbing';
    }
}

/**
 * 로컬라이저 캔버스 마우스 이동 이벤트 핸들러
 */
function handleLocMouseMove(e) {
    if (!isDraggingLoc) return;

    const rect = locCanvas.getBoundingClientRect();
    locAircraftX = e.clientX - rect.left - dragOffsetX;
    
    // 항공기 X 위치 제한
    locAircraftX = Math.max(aircraftWidth / 2, Math.min(locAircraftX, locCanvasWidth - aircraftWidth / 2));
    locAircraftY = Math.max(aircraftHeight / 2, Math.min(locAircraftY, locCanvasHeight - aircraftHeight / 2));

    updateSimulation();
}

/**
 * 로컬라이저 캔버스 마우스 업/아웃 이벤트 핸들러
 */
function handleLocMouseUp() {
    if (isDraggingLoc) {
        isDraggingLoc = false;
        locCanvas.style.cursor = 'grab';
    }
}

/**
 * 글라이드패스 캔버스 마우스 다운 이벤트 핸들러
 */
function handleGpMouseDown(e) {
    const rect = gpCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isAircraftClicked(gpCtx, gpAircraftX, gpAircraftY, mouseX, mouseY)) {
        isDraggingGp = true;
        dragOffsetX = mouseX - gpAircraftX;
        dragOffsetY = mouseY - gpAircraftY;
        gpCanvas.style.cursor = 'grabbing';
    }
}

/**
 * 글라이드패스 캔버스 마우스 이동 이벤트 핸들러
 */
function handleGpMouseMove(e) {
    if (!isDraggingGp) return;

    const rect = gpCanvas.getBoundingClientRect();
    gpAircraftY = e.clientY - rect.top - dragOffsetY; 

    // 항공기 Y 위치 제한
    gpAircraftX = Math.max(aircraftWidth / 2, Math.min(gpAircraftX, gpCanvasWidth - aircraftWidth / 2));
    gpAircraftY = Math.max(aircraftHeight / 2, Math.min(gpAircraftY, gpCanvasHeight - aircraftHeight / 2));

    updateSimulation();
}

/**
 * 글라이드패스 캔버스 마우스 업/아웃 이벤트 핸들러
 */
function handleGpMouseUp() {
    if (isDraggingGp) {
        isDraggingGp = false;
        gpCanvas.style.cursor = 'grab';
    }
}

// --- DDM 버튼 클릭 핸들러 함수 ---

/**
 * 로컬라이저 항공기를 특정 DDM 위치로 이동시킵니다.
 * @param {number} targetDdm 목표 DDM 값
 */
function setLocAircraftToDdm(targetDdm) {
    // 캔버스 중앙 X에서 targetDdm에 해당하는 픽셀 오프셋 계산
    const targetOffsetPx = (targetDdm / MAX_DISPLAY_DDM) * (locCanvasWidth / 2);
    locAircraftX = (locRunwayX + locRunwayWidth / 2) + targetOffsetPx;

    // 캔버스 경계를 넘지 않도록 제한
    locAircraftX = Math.max(aircraftWidth / 2, Math.min(locAircraftX, locCanvasWidth - aircraftWidth / 2));
    updateSimulation();
}

/**
 * 글라이드패스 항공기를 특정 DDM 위치로 이동시킵니다.
 * @param {number} targetDdm 목표 DDM 값
 */
function setGpAircraftToDdm(targetDdm) {
    // 캔버스 왼쪽 끝에서의 이상적인 경로 Y (여기서 항공기 X가 고정되므로 이 값도 고정)
    const currentIdealY_at_zero_x = gpAntennaY - (gpAntennaX - gpAircraftX) * Math.tan(GLIDE_SLOPE_ANGLE_RAD);
    
    // targetDdm에 해당하는 픽셀 오프셋 계산 (Y축은 반대 방향으로 이동)
    const targetOffsetPx = (targetDdm / MAX_DISPLAY_DDM) * (gpCanvasHeight / 2);
    // gpAircraftY = currentIdealY_at_zero_x + targetOffsetPx; // 기존 로직
    // Y축은 위로 갈수록 값이 작아지므로, 양수 DDM (아래 편차)는 Y값을 증가시켜야 하고
    // 음수 DDM (위 편차)는 Y값을 감소시켜야 합니다.
    // DDM 값과 Y축 방향이 일치하므로 offset을 더합니다.
    gpAircraftY = currentIdealY_at_zero_x + targetOffsetPx;


    // 캔버스 경계를 넘지 않도록 제한
    gpAircraftY = Math.max(aircraftHeight / 2, Math.min(gpAircraftY, gpCanvasHeight - aircraftHeight / 2));
    updateSimulation();
}


/**
 * 전체 시뮬레이션을 업데이트하는 함수
 */
function updateSimulation() {
    // DDM 값 계산
    const locDdmValue = calculateLocDdm(locAircraftX);
    const gpDdmValue = calculateGpDdm(gpAircraftY); // GP 캔버스의 Y 위치 사용
    
    // ILS 계기판 업데이트
    updateIlsInstrument(locDdmValue, gpDdmValue);

    // DDM 값 디스플레이 업데이트 (소수점 넷째 자리까지)
    locDdmDisplay.textContent = locDdmValue.toFixed(4);
    gpDdmDisplay.textContent = gpDdmValue.toFixed(4);
    
    // 각 캔버스 다시 그리기
    drawLocCanvas();
    drawGpCanvas();
}

// --- 이벤트 리스너 등록 ---
locCanvas.addEventListener('mousedown', handleLocMouseDown);
locCanvas.addEventListener('mousemove', handleLocMouseMove);
locCanvas.addEventListener('mouseup', handleLocMouseUp);
locCanvas.addEventListener('mouseout', handleLocMouseUp);
locCanvas.style.cursor = 'grab';

gpCanvas.addEventListener('mousedown', handleGpMouseDown);
gpCanvas.addEventListener('mousemove', handleGpMouseMove);
gpCanvas.addEventListener('mouseup', handleGpMouseUp);
gpCanvas.addEventListener('mouseout', handleGpMouseUp);
gpCanvas.style.cursor = 'grab';

// --- DDM 버튼 이벤트 리스너 등록 ---
locZeroBtn.addEventListener('click', () => setLocAircraftToDdm(0));
locNegWidthBtn.addEventListener('click', () => setLocAircraftToDdm(-ILS_FULL_SCALE_DDM));
locPosWidthBtn.addEventListener('click', () => setLocAircraftToDdm(ILS_FULL_SCALE_DDM));
locNeg300Btn.addEventListener('click', () => setLocAircraftToDdm(-MAX_DISPLAY_DDM));
locPos300Btn.addEventListener('click', () => setLocAircraftToDdm(MAX_DISPLAY_DDM));


gpZeroBtn.addEventListener('click', () => setGpAircraftToDdm(0));
gpNegWidthBtn.addEventListener('click', () => setGpAircraftToDdm(-ILS_FULL_SCALE_DDM));
gpPosWidthBtn.addEventListener('click', () => setGpAircraftToDdm(ILS_FULL_SCALE_DDM));
gpNeg300Btn.addEventListener('click', () => setGpAircraftToDdm(-MAX_DISPLAY_DDM));
gpPos300Btn.addEventListener('click', () => setGpAircraftToDdm(MAX_DISPLAY_DDM));


// 초기 시뮬레이션 상태 업데이트
updateSimulation();