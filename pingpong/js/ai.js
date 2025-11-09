// AI helpers (multi-ball). Exposes PP.AI with parameterized behaviors.
PP.AI = {};

// Choose best ball (first to reach AI paddle) and predict Y position
// params: balls array, canvasWidth, paddleWidth, ballSize
PP.AI.findBestIncoming = function(balls, canvasWidth, paddleWidth, ballSize) {
  let bestBall = null;
  let bestTime = Infinity;
  let bestPrediction = canvasWidth / 2;
  for (let ball of balls) {
    if (ball.vx > 0) {
      let time = (canvasWidth - paddleWidth - 10 - ball.x - ball.size) / ball.vx;
      if (time > 0 && time < bestTime) {
        let prediction = ball.y + ball.vy * time;
        prediction = PP.reflectPrediction(prediction, ball.size, PP.INTERNAL_HEIGHT);
        bestBall = ball;
        bestTime = time;
        bestPrediction = prediction;
      }
    }
  }
  return { bestBall, bestTime, bestPrediction };
};

// Parameterized AI mover
// difficulty: { errorRange, speedMultiplier, relaxWhenAway }
// rightPaddleY is mutated in-place by the caller
PP.AI.update = function(balls, rightPaddleYRef, paddleHeight, paddleWidth, difficulty) {
  if (balls.length === 0) return;
  const canvasW = PP.INTERNAL_WIDTH;
  const res = PP.AI.findBestIncoming(balls, canvasW, paddleWidth, 15);
  const aiCenter = rightPaddleYRef.value + paddleHeight / 2;
  if (res.bestBall) {
    let target = res.bestPrediction + (Math.random() * difficulty.errorRange - difficulty.errorRange / 2);
    if (aiCenter < target - 10) rightPaddleYRef.value += Math.max(1, (difficulty.speedMultiplier || 1) * 7);
    else if (aiCenter > target + 10) rightPaddleYRef.value -= Math.max(1, (difficulty.speedMultiplier || 1) * 7);
  } else {
    // move to center slowly
    let target = PP.INTERNAL_HEIGHT / 2;
    if (aiCenter < target - 10) rightPaddleYRef.value += (difficulty.relaxWhenAway || 0.5) * 7;
    else if (aiCenter > target + 10) rightPaddleYRef.value -= (difficulty.relaxWhenAway || 0.5) * 7;
  }
  // clamp
  rightPaddleYRef.value = Math.max(0, Math.min(PP.INTERNAL_HEIGHT - paddleHeight, rightPaddleYRef.value));
};