// 仕様
// 720x480

// いいよこれで。
// どうせどうでもいいコードでしょ
// スライダー、0.1刻みで-10～10いじれるようにして。

// applyMatrixやめる。計算で上下反転させればいいだけの話でしょ？？
// てかもうこだわるのやめるか・・軸も無くしたし。逆だと思ってもらって。

let spurPool;
let system;
let isLoop = true;

let colorBandImg;

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト
const headAddress = "https://inaridarkfox4231.github.io/LTspurAssets/";

function preload(){
  // 最後に画像をクラウドから取り寄せる処理書きたいかな・・（カラーバンドの所がいちいち面倒）
  colorBandImg = loadImage(headAddress + "colorBand.png");
  //colorBandImg = loadImage("colorBand.png"); // OpenProcessing用
}

// 余白280の使い方。
// 数字のスペースは上部の280x160のところ。
// 100, 180が横、40, 120が縦。そんな感じ。
// その次の280x160で横のサークルスライダーを4本用意する。ひとつひとつが縦40のスペースを用い、
// 長さ200で半径10(直径20).

function setup(){
  createCanvas(760, 480);
  colorMode(HSB, 240);
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

function mousePressed(){
  system.elementControllerArray.forEach((eachSlider) => {
    if(eachSlider.hit(mouseX - 240, mouseY - 240)){ eachSlider.activate(); }
  })
  system.colorControllerArray.forEach((eachSlider) => {
    if(eachSlider.hit(mouseX - 240, mouseY - 240)){ eachSlider.activate(); }
  })
}

function mouseReleased(){
  let elementUpdateCheck = false;
  system.elementControllerArray.forEach((eachSlider) => {
    if(eachSlider.active){ elementUpdateCheck = true; }
  })
  if(elementUpdateCheck){
    system.elementControllerArray.every("inActivate");
    system.elementUpdate();
  }
  let colorBandUpdateCheck = false;
  system.colorControllerArray.forEach((eachSlider) => {
    if(eachSlider.active){ colorBandUpdateCheck = true; }
  })
  if(colorBandUpdateCheck){
    system.colorControllerArray.every("inActivate");
    system.colorBandUpdate();
  }
}

function draw(){
	const start = performance.now(); // 時間表示。
  background(0);
  translate(240, 240);
  // 白線で座標軸 座標軸やめよう
  // spurを生成する（10fcごとにどこかにランダムで1個）
  system.update();
  system.createSpur();
  system.act();
  system.display();
  // コンフィグ
  system.drawConfig();
  fill(0, 0, 100);
  stroke(0);
	text(spurPool.nextFreeSlot, 50, 50);
  const end = performance.now();
  const timeStr = (end - start).toPrecision(4);
  let innerText = `${timeStr}ms`;
  fill(0, 0, 240);
  text(innerText, 0, 100);
}

// ---------------------------------------------------------------------------------------- //
// visualize system.
class visualizeSystem{
  constructor(){
    this.unitArray = new CrossReferenceArray();
    this.spurArray = new CrossReferenceArray();
    this.setUnitInterval = 3;
    this.properFrameCount = 0; // パターン変更の際にリセットする感じ？
    this.elems = [0, 1, -1, 0]; // これを用いてbehaviorをセットする感じ
    this.elemStrings = ["0.0", "1.0", "-1.0", "0.0"]; // 画像表示用の文字列配列
    this.minUnitLifespan = 30; // ユニットの寿命の最小値
    this.maxUnitLifespan = 45; // ユニットの寿命の最大値
    this.minSpurLifespan = 30; // シュプールの寿命の最小値
    this.maxSpurLifespan = 45; // シュプールの寿命の最大値
		this.pivotHue = 0; // 基準となる色
    this.bandWidth = 1; // 色幅（この幅を行ったり来たりする）
    this.diffHue = 0;
    this.elementControllerArray = new CrossReferenceArray();
    this.colorControllerArray = new CrossReferenceArray();
    this.prepareController();
    this.elementUpdate();
  }
  prepareController(){
    // 4本のスライダーを用意。横は？とりあえず-6～6(middleにする。short(2)とlong(10)は未実装).
    let slider11 = new HorizontalSlider(-6, 6, new CircleCursor(10), -80, 260, 500, -240);
    let slider12 = new HorizontalSlider(-6, 6, new CircleCursor(10), -40, 260, 500, -240);
    let slider21 = new HorizontalSlider(-6, 6, new CircleCursor(10), 0, 260, 500, -240);
    let slider22 = new HorizontalSlider(-6, 6, new CircleCursor(10), 40, 260, 500, -240);
    // デフォルトを0, 1, -1, 0にする
    slider11.setPosX(380);
    slider12.setPosX(400);
    slider21.setPosX(360);
    slider22.setPosX(380);
    // 登録
    this.elementControllerArray.add([slider11, slider12, slider21, slider22]);
    let v1 = createVector(-10, -20);
    let v2 = createVector(10, -20);
    let v3 = createVector(-10, 20);
    let v4 = createVector(10, 20);
    let sliderUpper = new HorizontalSlider(0, 239, new TriangleCursor(v1, v2), 100, 260, 499, -240);
    let sliderLower = new HorizontalSlider(0, 239, new TriangleCursor(v3, v4), 140, 260, 499, -240);
    this.colorControllerArray.add([sliderUpper, sliderLower]);
  }
  update(){
    this.properFrameCount++;
    if(this.properFrameCount % this.setUnitInterval === 0){ this.createUnit(); }
    this.spurArray.every("update");
    this.unitArray.every("update");
    this.elementControllerArray.every("update");
    // ここでマウスが押されてる間だけ例の文字列の更新を行うようにすればいいかも
    if(mouseIsPressed){ this.elemStringsUpdate(); }
    this.colorControllerArray.every("update");
  }
  elementUpdate(){
    // 各種スライダーから値を取得してelementの値を更新する
    for(let i = 0; i < 4; i++){
      this.elems[i] = Math.floor(this.elementControllerArray[i].getValue() * 10) * 0.1;
    }
  }
  colorBandUpdate(){
    let x0 = Math.floor(this.colorControllerArray[0].getValue());
    let x1 = Math.floor(this.colorControllerArray[1].getValue());
    // x0, x1のうち小さい方から大きい方、という風にいろいろいじる。
    this.pivotHue = Math.min(x0, x1);
    this.bandWidth = abs(x0 - x1) + 1;
    this.diffHue = 0;
  }
  elemStringsUpdate(){
    // 行列要素を文字列に変換（スライダーから値を取らないといけないので注意）
    for(let i = 0; i < 4; i++){
      this.elemStrings[i] = this.elementControllerArray[i].getValue().toFixed(1);
    }
  }
  createUnit(){
    // ユニットを生成する
    this.diffHue++;
    if(this.diffHue > 2 * this.bandWidth){ this.diffHue -= 2 * this.bandWidth; }
    let hue = (this.pivotHue + this.diffHue) % 240;
    if(this.diffHue > this.bandWidth){ hue = (this.pivotHue + 2 * this.bandWidth - this.diffHue) % 240; }
    let x = (random(1) * 2 - 1) * 240;
    let y = (random(1) * 2 - 1) * 240;
    //let toX = this.elems[0] * x + this.elems[1] * y;
    //let toY = this.elems[2] * x + this.elems[3] * y;
    // applyMatrixしなくても下記のようにすればy軸上方の一次変換を適用できる(計算は簡単)。
    let toX = this.elems[0] * x - this.elems[1] * y;
    let toY = -this.elems[2] * x + this.elems[3] * y;
    // 寿命に幅を持たせる（ユニットとシュプール両方）
    let unitLifespan = Math.floor(random(this.minUnitLifespan, this.maxUnitLifespan));
    let spurLifespan = Math.floor(random(this.minSpurLifespan, this.maxSpurLifespan));
    let vx = (toX - x) / unitLifespan;
    let vy = (toY - y) / unitLifespan;
    let newUnit = new unit(hue);
    newUnit.setPosition(x, y)
           .setVelocity(vx, vy)
           .setBehavior([timeLimitVanish(unitLifespan), fail])
           .setSpurLifespan(spurLifespan);
    this.unitArray.add(newUnit);
  }
  createSpur(){
    // シュプールを生成する
    this.unitArray.forEach(
      (u) => {
        let newSpur = spurPool.use();
    		newSpur.setting(u.position, u.prevPosition, u.hue, u.spurLifespan, u.spurWeight);
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
  drawConfig(){
    textAlign(CENTER, CENTER);
    textSize(20);
    fill(0, 0, 240);
    stroke(0);
    text(this.elemStrings[0], 340, -200);
    text(this.elemStrings[1], 420, -200);
    text(this.elemStrings[2], 340, -140);
    text(this.elemStrings[3], 420, -140);
    stroke(0, 0, 240);
    strokeWeight(1.0);
    line(260, -80, 500, -80);
    line(260, -40, 500, -40);
    line(260, 0, 500, 0);
    line(260, 40, 500, 40);
    noStroke();
    this.elementControllerArray.every("display");
    this.colorControllerArray.every("display");
    image(colorBandImg, 260, 100);
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
    this.spurWeight = random(3, 6);
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
	setting(pos, prevPos, hue, lifespanFrameCount, weight){
		this.startX = pos.x;
		this.startY = pos.y;
		this.endX = prevPos.x;
		this.endY = prevPos.y;
		this.hue = hue;
		this.lifespanFrameCount = lifespanFrameCount;
		this.coefficient = 240 / lifespanFrameCount;
    this.weight = weight;
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
		strokeWeight(this.weight);
    let saturation = this.lifespanFrameCount * this.coefficient;
		stroke(this.hue, saturation, 240, saturation);
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
// Slider and Cursor.

// あくまでスライダーは上下もしくは左右に動くオブジェクトで動く範囲が制限されており、
// なおかつ何かしらの値を返すものである。
// 動かせるオブジェクトはカーソルと呼ばれて画像を貼り付ける。
// とりあえずダミー。
// hit(x, y)のxとyにmouseClickedのときのxとyを入れて調べてOKが出たらactivateされて
// その間にマウスを動かすとカーソルが動いて値が変わる、
// マウスを離すとinActivateされて更新が止まる。

// 4つの要素に対応した4つと、色をいじる3角形が2つ（バンドを定める）
// 4つは240個の・・うん。3と6と12を考えている。いじれるようにする。0.1刻みで変更可能。
// -3～3, -6～6, -12～12. クリックで順繰りに。

// カーソルの当たり判定めんどくさいからsliderPos中心に半径10の円で決め打ちにしよう（めんどくさい）
// 本音いうとverticalSliderとhorizontalSliderで別に作りたいんだよね・・・
// といいつつ同じメソッド書きたくないんだよね・・
// なんとかならないのーーー

// cursorを別クラスにしてコンポジットする。オブジェクトでもいいけど。クラスかなぁ。
// hitとdisplayはcursorで、それ以外は・・
// 三角形の場合は頂点、円の場合は中心がsliderPosに相当する感じ。

// minとmaxのValueは逆でも普通に挙動する。大きいから小さい、でも充分OK.

// cursorのcursorImgはdefault:trueの場合とそれ以外で分ける。デフォルトも便利なので（どうでもいい場合）。
// setterでやればいいやんね。
// setImgはスライダーにも用意してカーソルにアクセスできるようにする。

class Slider{
  constructor(minValue, maxValue, cursor){
    this.minValue = minValue;
    this.maxValue = maxValue;
    // 円とか三角形とか。offSetは要らないかも。三角形はベクトルでやる。四角形はいわずもがな。
    this.cursor = cursor;
    // activeのとき、カーソルが動く
    this.active = false;
  }
  activate(){
    this.active = true;
  }
  inActivate(){
    this.active = false;
  }
  setMinValue(newMinValue){
    this.minValue = newMinValue; // min値の変更
  }
  setMaxValue(newMaxValue){
    this.maxValue = newMaxValue; // maxの変更
  }
  getSliderPos(){
    return {x:this.sliderPos.x, y:this.sliderPos.y};
  }
  hit(x, y){
    // (x, y)がcursorの画像上かどうか判定する感じ
    return this.cursor.hit(x, y, this.sliderPos);
  }
  update(){ /* 継承先により異なる */ }
  display(){
    this.cursor.display(this.sliderPos, this.active); // 円とか三角形。activeで画像指定。
  }
  setImg(nonActiveImg, activeImg){
		this.cursor.setImg(nonActiveImg, activeImg);
	}
  getValue(){ /* 継承先により異なる */ }
}

// 縦のスライダー（ただし落ちない）
class VerticalSlider extends Slider{
  constructor(minValue, maxValue, cursor, posX, top, down, offSetY = 0){
    super(minValue, maxValue, cursor);
    // 位置関係
    this.posX = posX;
    this.top = top; // 上
    this.down = down; // 下
    this.sliderPos = createVector(posX, top);
    this.offSetY = offSetY; // 設置位置によってはmouseYを直接使えないことがあるので・・
  }
  update(){
    if(this.active){
      // 縦スライダー
      this.sliderPos.set(this.posX, constrain(mouseY + this.offSetY, this.top, this.down));
    }
  }
  setPosY(y){
    this.sliderPos.y = y;
  }
  getValue(){
    // 縦スライダー
    return map(this.sliderPos.y, this.top, this.down, this.minValue, this.maxValue);
  }
}

// 横のスライダー、今回使うのはこっち（変化球ではない）
class HorizontalSlider extends Slider{
  constructor(minValue, maxValue, cursor, posY, left, right, offSetX = 0){
    super(minValue, maxValue, cursor);
    // 位置関係
    this.posY = posY;
    this.left = left; // 左
    this.right = right; // 右
    this.sliderPos = createVector(left, posY);
    this.offSetX = offSetX; // 設置位置によってはmouseXを直接・・以下略。
  }
  update(){
    if(this.active){
      // 横スライダー
      this.sliderPos.set(constrain(mouseX + this.offSetX, this.left, this.right), this.posY);
    }
  }
  setPosX(x){
    this.sliderPos.x = x;
  }
  getValue(){
    // 横スライダー
    return map(this.sliderPos.x, this.left, this.right, this.minValue, this.maxValue);
  }
}

// 斜めのスライダー（ありません）

// 円形三角形四角形
// activeとinActiveの画像を渡して共通の処理とするんだけど後でいいや。
class Cursor{
  constructor(){
    this.cursorImg = {};
		this.useOriginalImg = false; // オリジナル画像を使わない場合はデフォルト。
  }
  hit(x, y, pivotVector){ return false; }
  display(pivotVector, isActive){}
  setImg(nonActiveImg, activeImg){
    this.useOriginalImg = true;
		this.cursorImg.nonActiveImg = nonActiveImg;
		this.cursorImg.activeImg = activeImg;
	}
}

class CircleCursor extends Cursor{
  constructor(cursorRadius){
    super();
    this.cursorRadius = cursorRadius;
    this.offSetX = -cursorRadius;
    this.offSetY = -cursorRadius;
  }
  hit(x, y, pivotVector){
    return dist(x, y, pivotVector.x, pivotVector.y) < this.cursorRadius;
  }
  display(pivotVector, isActive){
		if(this.useOriginalImg){
      // 画像貼り付けの場合
      let x = pivotVector.x + this.offSetX;
      let y = pivotVector.y + this.offSetY;
      let imgPath = (isActive ? "activeImg" : "nonActiveImg");
      image(this.cursorImg[imgPath], x, y);
		}else{
      // デフォルト
      if(isActive){ fill(0, 180, 240); }else{ fill(170, 180, 240); }
      ellipse(pivotVector.x, pivotVector.y, this.cursorRadius * 2, this.cursorRadius * 2);
		}
  }
}

// 横幅と縦幅
class RectCursor extends Cursor{
  constructor(cursorHalfWidth, cursorHalfHeight){
    super();
    this.cursorHalfWidth = cursorHalfWidth;
    this.cursorHalfHeight = cursorHalfHeight;
    this.offSetX = -cursorHalfWidth;
    this.offSetY = -cursorHalfHeight;
  }
  hit(x, y, pivotVector){
    return abs(x - pivotVector.x) < this.cursorHalfWidth && abs(y - pivotVector.y) < this.cursorHalfHeight;
  }
  display(pivotVector, isActive){
		if(this.useOriginalImg){
			// 画像貼り付けの場合
      let x = pivotVector.x + this.offSetX;
      let y = pivotVector.y + this.offSetY;
      let imgPath = (isActive ? "activeImg" : "nonActiveImg");
      image(this.cursorImg[imgPath], x, y);
		}else{
			// デフォルト
      if(isActive){ fill(0, 180, 240); }else{ fill(170, 180, 240); }
      rect(pivotVector.x + this.offSetX, pivotVector.y + this.offSetY, this.cursorHalfWidth * 2, this.cursorHalfHeight * 2);
		}
  }
}

// 位置を示すベクトル2つ、といっても基本的には上下左右4パターンだけど。頂点がpivotに相当する。
// hitがめんどくさい。
// offSetはたとえばxならv1.x, v2.x, 0のうち小さい方。yも同様。これは画像貼り付けに使うデータで、
// デフォルト三角形ならベクトル使うだけだから楽チン。
class TriangleCursor extends Cursor{
  constructor(v1, v2){
    super();
    this.cursorV1 = v1;
    this.cursorV2 = v2;
    this.offSetX = Math.min(0, v1.x, v2.x);
    this.offSetY = Math.min(0, v1.y, v2.y);
    // 計算に使う値（vertex1, vertex2が一次独立だから）|v1|^2 * |v2|^2 - (v1・v2)^2 > 0.
    let n1 = v1.magSq();
    let n2 = v2.magSq();
    let innerProd = p5.Vector.dot(v1, v2);
    this.dValue = n1 * n2 - innerProd * innerProd; // 正の数。
    // まず|v2|^2 * v1と|v1|^2 * v2, さらに(v1・v2) * v2と(v1・v2) * v1を計算する。
    let v3 = p5.Vector.mult(v1, n2);
    let v4 = p5.Vector.mult(v2, n1);
    let v5 = p5.Vector.mult(v2, innerProd);
    let v6 = p5.Vector.mult(v1, innerProd);
    // はじめのは|v2|^2 * v1 - (v1・v2) * v2. check1・v > 0が条件1.
    this.checkVector1 = p5.Vector.sub(v3, v5);
    // 次のやつは|v1|^2 * v2 - (v1・v2) * v1. check2・v > 0が条件2.
    this.checkVector2 = p5.Vector.sub(v4, v6);
    // さいごにこの二つを足してcheck3とする。 check3・v < D が条件3.
    this.checkVector3 = p5.Vector.add(this.checkVector1, this.checkVector2);
  }
  hit(x, y, pivotVector){
    let check1 = (x - pivotVector.x) * this.checkVector1.x + (y - pivotVector.y) * this.checkVector1.y;
    let check2 = (x - pivotVector.x) * this.checkVector2.x + (y - pivotVector.y) * this.checkVector2.y;
    let check3 = (x - pivotVector.x) * this.checkVector3.x + (y - pivotVector.y) * this.checkVector3.y;
    return check1 > 0 && check2 > 0 && check3 < this.dValue;
  }
  display(pivotVector, isActive){
		if(this.useOriginalImg){
			// 画像貼り付けの場合
      let x = pivotVector.x + this.offSetX;
      let y = pivotVector.y + this.offSetY;
      let imgPath = (isActive ? "activeImg" : "nonActiveImg");
      image(this.cursorImg[imgPath], x, y);
		}else{
			// デフォルト
      if(isActive){ fill(0, 180, 240); }else{ fill(170, 180, 240); }
      let x1 = pivotVector.x + this.cursorV1.x;
      let y1 = pivotVector.y + this.cursorV1.y;
      let x2 = pivotVector.x + this.cursorV2.x;
      let y2 = pivotVector.y + this.cursorV2.y;
      triangle(pivotVector.x, pivotVector.y, x1, y1, x2, y2);
		}
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
    if(element.length === undefined){
      this.push(element);
      element.belongingArray = this; // 所属配列への参照
    }else{
      for(let i = 0; i < element.length; i++){
        let e = element[i];
        this.push(e);
        e.belongingArray = this; // 複数の場合
      }
    }
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
