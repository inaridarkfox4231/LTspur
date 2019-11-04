// バグの原因が分かった
// あれだ、removeを2回やっちゃってる・・1回でいいのに・・馬鹿。

let spurPool;
let spurArray;
let ballArray;

let createInterval = 30;
let settingHue = 0;
let hueInterval = 2;

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

function setup(){
	createCanvas(400, 400);
	colorMode(HSB, 100);
	spurPool = new ObjectPool(() => { return new spur(); }, 1200);
	spurArray = new CrossReferenceArray();
	ballArray = new CrossReferenceArray();
}

function draw(){
	//const start = performance.now(); // 時間表示。
	background(0);
	if(frameCount % createInterval === 0){
		for(let i = 0; i < 1; i++){ createBall(settingHue, 0); }
		settingHue += hueInterval;
		if(settingHue > 100){ settingHue -= 100; }
	}
  ballArray.every("update");
	ballArray.every("act");
	spurArray.every("update");
	spurArray.every("display");
	//fill(0, 0, 100);
	//text(spurPool.nextFreeSlot, 50, 50);
  //const end = performance.now();
  //const timeStr = (end - start).toPrecision(4);
  //let innerText = `${timeStr}ms`;
	fill(0);
	//text(innerText, 0, 100);
	text(spurPool.nextFreeSlot, 50, 50);
}

class ball{
	constructor(hue){
		this.position = createVector();
		this.prevPosition = createVector();
		this.velocity = createVector();
		this.properFrameCount = 0;
		this.behaviorList = [];
    this.hue = hue;
		this.spurLifespan = 0;
	}
	setPosition(x, y){
		this.position.set(x, y);
		return this;
	}
	setVelocity(vx, vy){
		this.velocity.set(vx, vy);
		return this;
	}
	setPolarVelocity(radius, direction){
		this.velocity.set(radius * cos(direction), radius * sin(direction));
		return this;
	}
	setBehavior(behaviorList){
		this.behaviorList = behaviorList;
		return this;
	}
	setSpurLifespan(spurLifespan){
		this.spurLifespan = spurLifespan;
		return this;
	}
	update(){
		this.prevPosition.set(this.position.x, this.position.y);
		this.position.add(this.velocity);
		this.createSpur();
		this.properFrameCount++;
	}
	act(){
		/* act behavior */
		this.behaviorList.forEach((behavior) => { behavior(this); });
	}
  createSpur(){
		let newSpur = spurPool.use();
		newSpur.setting(this.position, this.prevPosition, this.hue, this.spurLifespan);
		spurArray.add(newSpur);
	}
	display(){
		// あれ？
	}
	remove(){
		this.belongingArray.remove(this);
	}
}

// ---------------------------------------------------------------------------------------- //
// createBall Method.

function createBall(h, patternId){
	let newBall = new ball(h);
	switch(patternId){
		case 0:
			newBall.setPosition(random(20, width - 20), random(20, height - 20))
			       .setPolarVelocity(random(3, 8), random(TWO_PI))
			       .setBehavior([reflection, timeLimitVanish(300)])
			       .setSpurLifespan(50);
			break;
		case 1:
		  newBall.setPosition(width / 2, height / 2)
			       .setVelocity(random([-1, 1]) * random(3, 6), -random(4, 8))
			       .setBehavior([falling(0.49), fail])
			       .setSpurLifespan(60);
			break;
	}
	ballArray.add(newBall);
}

// ---------------------------------------------------------------------------------------- //
// Spur.

class spur{
	constructor(){
	}
	setting(pos, prevPos, hue, lifespanFrameCount){
		this.startX = pos.x;
		this.startY = pos.y;
		this.endX = prevPos.x;
		this.endY = prevPos.y;
		this.hue = hue;
		this.lifespanFrameCount = lifespanFrameCount;
		this.coefficient = 100 / lifespanFrameCount;
	}
	remove(){
		this.belongingArray.remove(this);
		spurPool.recycle(this);
	}
	update(){
		this.lifespanFrameCount--;
		if(this.lifespanFrameCount < 0){ this.remove(); }
	}
	display(){
		strokeWeight(7);
		stroke(this.hue, this.lifespanFrameCount * this.coefficient, 100, this.lifespanFrameCount * this.coefficient);
		line(this.startX, this.startY, this.endX, this.endY);
	}
}

// ---------------------------------------------------------------------------------------- //
// ObjectPool.

// ObjectPoolはどこで使っているかというと、particleの取得時。いじるのは取得時と破棄時。
// 作るときにgrow, 取得時にuse, 破棄時にrecycleを使うように書き換えればOK.
// particlePoolはParticleSetが持ってるからそっちでクラス化しようね

// 個別のイニシャライズ処理は汎用性が落ちるので廃止。取得してからinitializeするように書き換え。

class ObjectPool{
	constructor(objectFactory = (() => ({})), initialSize = 0){
		this.objPool = [];
		this.nextFreeSlot = null; // 使えるオブジェクトの存在位置を示すインデックス
		this.objectFactory = objectFactory;
		this.grow(initialSize);
	}
	use(){
		if(this.nextFreeSlot == null || this.nextFreeSlot == this.objPool.length){
		  this.grow(this.objPool.length || 5); // 末尾にいるときは長さを伸ばす感じ。lengthが未定義の場合はとりあえず5.
		}
		let objToUse = this.objPool[this.nextFreeSlot]; // FreeSlotのところにあるオブジェクトを取得
		this.objPool[this.nextFreeSlot++] = EMPTY_SLOT; // その場所はemptyを置いておく、そしてnextFreeSlotを一つ増やす。
    //objToUse.initialize(); // 個別のイニシャライズ処理を追加
		return objToUse; // オブジェクトをゲットする
	}
	recycle(obj){
		if(this.nextFreeSlot == null || this.nextFreeSlot == -1){
			this.objPool[this.objPool.length] = obj; // 図らずも新しくオブジェクトが出来ちゃった場合は末尾にそれを追加
		}else{
			// 考えづらいけど、this.nextFreeSlotが0のときこれが実行されるとobjPool[-1]にobjが入る。
			// そのあとでrecycleが発動してる間は常に末尾にオブジェクトが増え続けるからFreeSlotは-1のまま。
			// そしてuseが発動した時にその-1にあったオブジェクトが使われてそこにはEMPTY_SLOTが設定される
			this.objPool[--this.nextFreeSlot] = obj;
		}
	}
	grow(count = this.objPool.length){ // 長さをcountにしてcount個のオブジェクトを追加する
		if(count > 0 && this.nextFreeSlot == null){
			this.nextFreeSlot = 0; // 初期状態なら0にする感じ
		}
		if(count > 0){
			let curLen = this.objPool.length; // curLenはcurrent Lengthのこと
			this.objPool.length += Number(count); // countがなんか変でも数にしてくれるからこうしてるみたい？"123"とか。
			// こうするとかってにundefinedで伸ばされるらしい・・長さプロパティだけ増やされる。
			// 基本的にはlengthはpushとか末尾代入（a[length]=obj）で自動的に増えるけどこうして勝手に増やすことも出来るのね。
			for(let i = curLen; i < this.objPool.length; i++){
				// add new obj to pool.
				this.objPool[i] = this.objectFactory();
			}
			return this.objPool.length;
		}
	}
	size(){
		return this.objPool.length;
	}
}

// ---------------------------------------------------------------------------------------- //
// Cross Reference Array.

// 配列クラスを継承して、要素を追加するときに自動的に親への参照が作られるようにしたもの
class CrossReferenceArray extends Array{
	constructor(){
    super();
	}
  add(element){
    this.push(element);
    element.belongingArray = this; // 所属配列への参照
  }
  remove(element){
    let index = this.indexOf(element, 0);
    this.splice(index, 1); // elementを配列から排除する
  }
  every(methodName){
    // methodNameには"update"とか"display"が入る。まとめて行う処理。
    this.forEach((obj) => { obj[methodName](); });
  }
}

// ---------------------------------------------------------------------------------------- //
// Behavior.

// 簡単な反射
function reflection(obj){
	if(obj.position.x < 0 || obj.position.x > width){ obj.velocity.x *= -1; }
	if(obj.position.y < 0 || obj.position.y > height){ obj.velocity.y *= -1; }
}

// 自然消滅
function timeLimitVanish(limit){
	return (obj) => { if(obj.properFrameCount > limit){ obj.remove(); } }
}

// 重力
function falling(gravity){
	return (obj) => { obj.velocity.y += gravity; }
}

// 画面外で消滅
function fail(obj){
	if(obj.position.x < 0 || obj.position.x > width || obj.position.y < 0 || obj.position.y > height){ obj.remove(); }
}
