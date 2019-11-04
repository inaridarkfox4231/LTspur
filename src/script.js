// 仕様
// 720x480
// spurの生成器をユニットと名付ける。
// 10fcごとにランダムで1箇所にユニットを発生させる（120fcで消える）。
// その際に60fcで消えるspurを作り出す感じ。
// 120fcかけて変換先まで移動する感じですかね・・・・

// behaviorとしては自然消滅でいいんじゃない・・速度与えるだけで。どうせすぐ消えるし。
// なんか工夫欲しいけどね。

// なんとか露光っていうのはあれ、シュプールの寿命をどんどん小さくするのと、
// あとクリアをやめればいい。座標軸の更新とかも。

let spurPool;
let system;
let isLoop = true;

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

function setup(){
  createCanvas(720, 480);
  colorMode(HSB, 100);
  spurPool = new ObjectPool(() => { return new spur(); }, 1024);
  system = new visualizeSystem();
  //background(0);
}

function keyTyped(){
  if(key === 'p'){
    if(isLoop){ noLoop(); isLoop = false; return; }
    else{ loop(); isLoop = true; return; }
  }
}

function draw(){
  background(0);
  translate(240, 240);
  applyMatrix(1, 0, 0, -1, 0, 0);
  // 白線で座標軸
  stroke(0, 0, 100);
  strokeWeight(1.0);
  line(0, 240, 0, -240);
  line(240, 0, -240, 0);
  // spurを生成する（10fcごとにどこかにランダムで1個）
  system.update();
  system.createSpur();
  system.act();
  system.display();
  //translate(480, 0);
  // コンフィグ
  //fill(0, 0, 100);
	//text(spurPool.nextFreeSlot, 50, 50);
}

// ---------------------------------------------------------------------------------------- //
// visualize system.
class visualizeSystem{
  constructor(){
    this.unitArray = new CrossReferenceArray();
    this.spurArray = new CrossReferenceArray();
    this.setUnitInterval = 10;
    this.properFrameCount = 0; // パターン変更の際にリセットする感じ？
    this.elems = [2, 1.4, -0.6, 0.4]; // これを用いてbehaviorをセットする感じ
    this.unitLifespan = 120;
    this.spurLifespan = 60;
  }
  update(){
    this.properFrameCount++;
    if(this.properFrameCount % this.setUnitInterval === 0){ this.createUnit(); }
    this.spurArray.every("update");
    this.unitArray.every("update");
  }
  createUnit(){
    // ユニットを生成する
    let x = (random(1) * 2 - 1) * 240;
    let y = (random(1) * 2 - 1) * 240;
    let toX = this.elems[0] * x + this.elems[1] * y;
    let toY = this.elems[2] * x + this.elems[3] * y;
    let vx = (toX - x) / this.unitLifespan;
    let vy = (toY - y) / this.unitLifespan;
    let newUnit = new unit(0);
    newUnit.setPosition(x, y)
           .setVelocity(vx, vy)
           .setBehavior([timeLimitVanish(this.unitLifespan), fail]);
    this.unitArray.add(newUnit);
  }
  createSpur(){
    // シュプールを生成する
    this.unitArray.forEach(
      (u) => {
        let newSpur = spurPool.use();
    		newSpur.setting(u.position, u.prevPosition, u.hue, this.spurLifespan);
    		this.spurArray.add(newSpur);
      }
    )
  }
  act(){
    this.unitArray.every("act");
  }
  display(){
    this.spurArray.every("display");
  }
}

// ---------------------------------------------------------------------------------------- //
// unit.

class unit{
	constructor(hue){
		this.position = createVector();
		this.prevPosition = createVector();
		this.velocity = createVector();
		this.properFrameCount = 0;
		this.behaviorList = [];
    this.hue = hue;
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
		this.properFrameCount++;
	}
	act(){
		/* act behavior */
		this.behaviorList.forEach((behavior) => { behavior(this); });
	}
	remove(){
		this.belongingArray.remove(this);
	}
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

// 自然消滅
function timeLimitVanish(limit){
	return (obj) => { if(obj.properFrameCount > limit){ obj.remove(); } }
}

// 画面外で消滅
function fail(obj){
	if(obj.position.x < -240 || obj.position.x > 240 || obj.position.y < -240 || obj.position.y > 240){ obj.remove(); }
}
