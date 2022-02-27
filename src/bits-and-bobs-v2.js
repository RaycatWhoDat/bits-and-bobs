const isIterable = source => Symbol.iterator in Object(source);

class RangeItem {
  constructor(value = null) {
    this.value = value;
  }
}

class Range {
  constructor(source, begin = 0, end = 0) {
    // this.source = new Proxy(source, {
    //   get(target, prop) {
    //     if (prop in target) {
    //       let returnValue = target[prop];
    //       if (target.propertyIsEnumerable(prop) && !(target[prop] instanceof RangeItem) && !(target[prop] instanceof Range)) {
    //         returnValue = new RangeItem(target[prop]);
    //       }
    //       return returnValue;
    //     }
    //   }
    // });

    this.source = source;
    this.begin = begin;
    this.end = end;
    if (begin >= end) {
      if (isIterable(source)) this.end = source.length - 1;
      if (source instanceof Range) this.end = source.end;
    }
  }

  empty() {
    return this.begin >= this.end;
  }

  front() {
    return this.source[this.begin];
  }

  back() {
    return this.source[this.end];
  }
}

class ForwardRange extends Range {
  constructor(source, begin = 0, end = 0) {
    super(source, begin, end);
  }

  popFront() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.begin++;
  }

  forEach(func) {
    if (typeof func !== 'function') throw new Error('Foreach parameter is not a function.');
    for (; !this.empty(); this.popFront()) {
      func(this.front());
    }
  }
}

class BackwardsRange extends Range {
  constructor(source, begin = 0, end = 0) {
    super(source, begin, end);
  }

  popBack() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.end--;
  }
}

class BidirectionalRange extends Range {
  constructor(source, begin = 0, end = 0) {
    super(source, begin, end);
  }

  popFront() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.begin++;
  }

  popBack() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.end--;
  }
}

class Retro extends BidirectionalRange {
  constructor(source, begin = 0, end = 0) {
    super(source, begin, end);
    this.originalRange = new BidirectionalRange(source, begin, end);
  }

  front() {
    return this.source[this.end];
  }

  back() {
    return this.source[this.begin];
  }
  
  popFront() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.end--;
  }

  popBack() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.begin++;
  }

  retro(range = this) {
    return range instanceof Retro ? range.originalRange : new Retro(range);
  }
}

class Chain extends ForwardRange {
  constructor(...sources) {
    super(sources);
  }

  front() {
    return this.source[this.begin].front();
  }

  popFront() {
    const source = this.source[this.begin];
    if (source.empty()) {
      this.begin++;
    } else {
      source.popFront();
    }
  }

  empty() {
    return this.source[this.end].empty();
  }
}

class Zip extends ForwardRange {
  constructor(...sources) {
    super(sources);
  }

  front() {
    let zippedResults = [];
    for (let index = 0; index < this.source.length; index++) {
      zippedResults.push(this.source[index].front());
    }
    return zippedResults;
  }

  popFront() {
    for (let index = 0; index < this.source.length; index++) {
      if (!this.source[index].empty()) {
        this.source[index].popFront();
      }
    }
  }

  empty() {
    let isEmpty = false;
    for (let index = 0; index < this.source.length; index++) {
      if (this.source[index].empty()) {
        isEmpty = true;
        break;
      }
    }
    return isEmpty;
  }
}

// DEV: Can't handle Chains yet.
class Stride extends ForwardRange {
  constructor(source, stride = 1, begin = 0, end = 0) {
    super(source, begin, end);
    this.stride = stride ?? 1;
  }

  popFront() {
    this.begin += this.stride;
  }

  front() {
    let returnValue = null;
    if (this.source instanceof Range) {
      returnValue = this.source.front();
    }

    if (isIterable(this.source)) {
      returnValue = this.source[this.begin];
    }

    return returnValue;
  }
}

const testSource = [1, '2', [3], {four: 4}, new Chain(), new RangeItem(6), 7, 8];
const testRange1 = new ForwardRange(testSource);
console.log(testRange1.front());
testRange1.popFront();
console.log(testRange1.front());
console.log('====================');

let testRange2 = new Retro(testSource);
console.log(testRange2.front());
testRange2.popFront();
console.log(testRange2.front());
testRange2 = testRange2.retro();
testRange2.popFront();
console.log(testRange2.front());
console.log('====================');

const testRange3 = new Chain(
  new ForwardRange(testSource, 5),
  new ForwardRange(testSource, 2, 4),
  new ForwardRange(testSource)
);

testRange3.forEach(item => {
  console.log(item);
});

console.log('====================');

const testRange4 = new Zip(
  new ForwardRange(testSource),
  new Retro(testSource)
);

testRange4.forEach(([item1, item2]) => {
  console.log(item1, item2);
});
  
console.log('====================');

// const testRange5 = new Stride(
//   new Chain(
//     new ForwardRange(testSource, 5),
//     new ForwardRange(testSource, 2, 4),
//     new ForwardRange(testSource)
//   ), 2
// );

const testRange5 = new Stride(testSource, 2);

console.log(testRange5);

testRange5.forEach(item => {
  console.log(item, testRange5.begin);
});
  
