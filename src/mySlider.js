"use strict";

// いくつか変更点
// まず、スライダー経由でカーソルの色を変えられるようにしよう。
// あと、レールのデフォルトはnoStroke()を忘れるとえらいことになる。
// 色指定も255とかでなくcolor('white')のように指定しないとcolorModeの影響を受けてしまう。その辺かな。

let controller;
let backgroundColor;

function setup() {
	createCanvas(360, 500);
	noStroke();
	preparation();
	backgroundColor = color(0);
}

function draw() {
	background(backgroundColor);
	controller.update();
	controller.display();
	textAlign(CENTER, CENTER);
	textSize(20);
  fill(255);
	text(controller.red, 310, 40);
	text(controller.green, 310, 80);
	text(controller.blue, 310, 120);
  text(Math.floor(controller.rect1), 40, 170);
  rect(60, controller.rect1 + 198, 20, 6);
  let rectWidth = abs(controller.edge1 - controller.edge2);
  rect(Math.min(controller.edge1, controller.edge2), 160, rectWidth, 10);
	if(controller.active){
		backgroundColor = color(controller.red, controller.green, controller.blue); // いぇい、成功！！
	}
}

function preparation(){
	controller = new SliderSet();

	let cursor1 = new RectCursor(8, 16);
	cursor1.setColor(color(249, 176, 180), color(237, 28, 36));
	let slider1 = new HorizontalSlider("red", 0, 255, cursor1, 40, 20, 275, 12, 12);

	let cursor2 = new RectCursor(8, 16);
	cursor2.setColor(color(180, 241, 198), color(34, 177, 76));
	let slider2 = new HorizontalSlider("green", 0, 255, cursor2, 80, 20, 275, 12, 12);

	let cursor3 = new RectCursor(8, 16);
	cursor3.setColor(color(197, 200, 239), color(63, 72, 204));
	let slider3 = new HorizontalSlider("blue", 0, 255, cursor3, 120, 20, 275, 12, 12);

  let cursor4 = new CircleCursor(10, 10);
  cursor4.setColor(color(200, 255, 200), color(0, 255, 0));
  let slider4 = new VerticalSlider("rect1", 0, 100, cursor4, 40, 200, 300, 15, 15);

  let cursor5 = new TriangleCursor(-8, -20, 8, -20);
  cursor5.setColor(color(220), color(140));
  let slider5 = new HorizontalSlider("edge1", 160, 260, cursor5, 220, 160, 260, 20, 0);

  let cursor6 = new TriangleCursor(-8, 20, 8, 20);
  cursor6.setColor(color(220), color(140));
  let slider6 = new HorizontalSlider("edge2", 160, 260, cursor6, 220, 160, 260, 0, 20);

	controller.registMulti([slider1, slider2, slider3, slider4, slider5, slider6]);
}

// ---------------------------------------------------------------------------------------- //
// interaction.

function mousePressed(){
	controller.activate();
}

function mouseReleased(){
	controller.inActivate();
}

function touchStarted(){
	controller.activate();
	//return false;
}

function touchEnded(){
	controller.inActivate();
	//return false;
}

// ---------------------------------------------------------------------------------------- //
// Slider and Cursor.

class Slider{
  constructor(key, minValue, maxValue, cursor){
    this.key = key; // 作るときにキーを
    this.minValue = minValue;
    this.maxValue = maxValue;
    // 円とか三角形とか。offSetは要らないかも。三角形はベクトルでやる。四角形はいわずもがな。
    this.cursor = cursor;
    // activeのとき、カーソルが動く
    this.active = false;
    this.showRail = true; // レールを消したいときはこれ
  }
  activate(){
    this.active = true;
  }
  inActivate(){
    this.active = false;
  }
  hideRail(){
    // レールを消したいとき
    this.showRail = false;
  }
  setMinValue(newMinValue){
    this.minValue = newMinValue; // min値の変更
  }
  setMaxValue(newMaxValue){
    this.maxValue = newMaxValue; // maxの変更
  }
  setColor(nonActiveColor = color('#4169e1'), activeColor = color('#ff0000')){
    // スライダー経由でカーソルの色を変える感じ。
    this.cursor.setColor(nonActiveColor, activeColor);
  }
  hit(x, y){
    // hit関数。activateするための条件。activeなときにupdateするとスライダー位置が変わり、返す値も変わる仕様。
    return false;
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
  constructor(key, minValue, maxValue, cursor, posX, top, bottom, leftMargin = 5, rightMargin = 5, offSetY = 0){
    super(key, minValue, maxValue, cursor);
    // 位置関係
    this.posX = posX;
    this.top = top; // 上
    this.bottom = bottom; // 下
    this.leftMargin = leftMargin; // 左余白
    this.rightMargin = rightMargin; // 右余白
    this.sliderPos = createVector(posX, top);
    this.offSetY = offSetY; // 設置位置によってはmouseYを直接使えないことがあるので・・
  }
  update(){
    if(this.active){
      // 縦スライダー
      this.sliderPos.set(this.posX, constrain(mouseY + this.offSetY, this.top, this.bottom));
    }
  }
	display(){
		// 縦線。長方形でいいよね。
    if(this.showRail){
		  fill(color('white'));
      noStroke();
		  rect(this.posX - 2, this.top, 4, this.bottom - this.top);
    }
		super.display();
	}
  hit(x, y){
    const horizontal = (this.posX - this.leftMargin <= x && x <= this.posX + this.rightMargin);
    const vertical = (this.top <= y && y <= this.bottom);
    return horizontal && vertical;
  }
  setPosY(y){
    this.sliderPos.y = y;
  }
  getValue(){
    // 縦スライダー
    return map(this.sliderPos.y, this.top, this.bottom, this.minValue, this.maxValue);
  }
}

// 横のスライダー、今回使うのはこっち（変化球ではない）
class HorizontalSlider extends Slider{
  constructor(key, minValue, maxValue, cursor, posY, left, right, topMargin = 5, bottomMargin = 5, offSetX = 0){
    super(key, minValue, maxValue, cursor);
    // 位置関係
    this.posY = posY;
    this.left = left; // 左
    this.right = right; // 右
    this.topMargin = topMargin; // 反応範囲、上
    this.bottomMargin = bottomMargin; // 反応範囲、下
    this.sliderPos = createVector(left, posY);
    this.offSetX = offSetX; // 設置位置によってはmouseXを直接・・以下略。
  }
  update(){
    if(this.active){
      // 横スライダー
      this.sliderPos.set(constrain(mouseX + this.offSetX, this.left, this.right), this.posY);
    }
  }
	display(){
		// 横線。長方形でいいよね。
    if(this.showRail){
		  fill(color('white'));
      noStroke();
		  rect(this.left, this.posY - 2, this.right - this.left, 4);
    }
		super.display();
	}
  hit(x, y){
    const horizontal = (this.left <= x && x <= this.right);
    const vertical = (this.posY - this.topMargin <= y && y <= this.posY + this.bottomMargin);
    return horizontal && vertical;
  }
  setPosX(x){
    this.sliderPos.x = x;
  }
  getValue(){
    // 横スライダー
    return map(this.sliderPos.x, this.left, this.right, this.minValue, this.maxValue);
  }
}

// カーソル
// 円、四角、三角。
// activeとinActiveの画像を渡して共通の処理とするんだけど後でいいや。
// カーソルのhit関数は廃止。スライダーベースで判定しよう。

class Cursor{
  constructor(){
		this.cursorColor = {}; // デフォルト時のカーソルカラー
    this.cursorImg = {};
		this.useOriginalImg = false; // オリジナル画像を使わない場合はデフォルト。
  }
  display(pivotVector, isActive){}
  setColor(nonActiveColor = color('#4169e1'), activeColor = color('#ff0000')){
    // デフォルトはロイヤルブルーとレッド
		this.cursorColor.nonActiveColor = nonActiveColor;
		this.cursorColor.activeColor = activeColor;
	}
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
  display(pivotVector, isActive){
		if(this.useOriginalImg){
      // 画像貼り付けの場合
      let x = pivotVector.x + this.offSetX;
      let y = pivotVector.y + this.offSetY;
      let imgPath = (isActive ? "activeImg" : "nonActiveImg");
      image(this.cursorImg[imgPath], x, y);
		}else{
      // デフォルト
      if(isActive){ fill(this.cursorColor.activeColor); }else{ fill(this.cursorColor.nonActiveColor); }
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
  display(pivotVector, isActive){
		if(this.useOriginalImg){
			// 画像貼り付けの場合
      let x = pivotVector.x + this.offSetX;
      let y = pivotVector.y + this.offSetY;
      let imgPath = (isActive ? "activeImg" : "nonActiveImg");
      image(this.cursorImg[imgPath], x, y);
		}else{
			// デフォルト
      if(isActive){ fill(this.cursorColor.activeColor); }else{ fill(this.cursorColor.nonActiveColor); }
      rect(pivotVector.x + this.offSetX, pivotVector.y + this.offSetY, this.cursorHalfWidth * 2, this.cursorHalfHeight * 2);
		}
  }
}

// 位置を示すベクトル2つ、といっても基本的には上下左右4パターンだけど。頂点がpivotに相当する。
// hitがめんどくさい。
// offSetはたとえばxならv1.x, v2.x, 0のうち小さい方。yも同様。これは画像貼り付けに使うデータで、
// デフォルト三角形ならベクトル使うだけだから楽チン。
class TriangleCursor extends Cursor{
  constructor(x1, y1, x2, y2){
    super();
    this.cursorV1 = createVector(x1, y1);
    this.cursorV2 = createVector(x2, y2);
    this.offSetX = Math.min(0, x1, x2);
    this.offSetY = Math.min(0, y1, y2);
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
      if(isActive){ fill(this.cursorColor.activeColor); }else{ fill(this.cursorColor.nonActiveColor); }
      let x1 = pivotVector.x + this.cursorV1.x;
      let y1 = pivotVector.y + this.cursorV1.y;
      let x2 = pivotVector.x + this.cursorV2.x;
      let y2 = pivotVector.y + this.cursorV2.y;
      triangle(pivotVector.x, pivotVector.y, x1, y1, x2, y2);
		}
  }
}

// ---------------------------------------------------------------------------------------- //
// SliderSet.
// activateでマウス位置に応じて場合によってはいずれかのスライダーがactivateされて、
// マウスを動かすとスライダーが動いて値が変化する。
// マウスを離すとinActivateされて色々解除。
// さらにキー登録機能により、キーを元に値を取得することが出来て、
// 動かしたい変数をバインドさせることで特定のプロパティと連動して変化させることができる。

// キー値から直接値を取得したい（たとえば"red"がキーならthis.redで値が出るみたいな）

class SliderSet{
	constructor(){
		this.sliderArray = new CrossReferenceArray();
		this.sliderDict = {};
		this.activeSliderKey = "";
    this.active = false; // activeなスライダーがあるかどうか
	}
	regist(slider){
    // 登録時にキーから接続できるようにして・・さらにキーから値を取得できるようにパスを作る
		this.sliderArray.add(slider);
    this.sliderDict[slider.key] = slider;
    this[slider.key] = slider.getValue();
	}
  registMulti(sliderArray){
    // 複数版
    sliderArray.forEach((slider) => { this.regist(slider); })
  }
	update(){
		this.sliderArray.every("update");
		// アクティブな場合のみ値変更
		if(this.active){ this[this.activeSliderKey] = this.sliderDict[this.activeSliderKey].getValue(); }
	}
	display(){
		this.sliderArray.every("display");
	}
	activate(offSetX = 0, offSetY = 0){
		// マウス位置がヒットしたらactivate. ひとつまで。
		this.sliderArray.forEach((eachSlider) => {
			if(eachSlider.hit(mouseX + offSetX, mouseY + offSetY)){
				eachSlider.activate();
        this.active = true;
				this.activeSliderKey = eachSlider.key; // activeなスライダーのキーをセット（これの為にキーを登録した）
				return;
			}
		})
	}
	inActivate(){
		this.sliderArray.every("inActivate");
		this.activeSliderKey = "";
    this.active = false;
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
  addMulti(elementArray){
    // 複数の場合
    elementArray.forEach((element) => { this.add(element); })
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
