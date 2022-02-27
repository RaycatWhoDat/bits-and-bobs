const isIterable = source => Symbol.iterator in Object(source);

class RangeItem {
  constructor(value = null) {
    this.value = value;
  }
}

class Range {
  constructor(source, begin = 0, end = 0) {
    this.source = source;
    this.begin = begin;
    this.end = end;
    if (begin >= end) {
      if (isIterable(source)) this.end = source.length ? source.length - 1 : 0;
      if (source instanceof Range) this.end = source.end;
    }
  }

  empty() {
    return this.begin >= this.end;
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

  back() {
    let returnValue = null;
    if (this.source instanceof Range) {
      returnValue = this.source.back();
    }
    
    if (isIterable(this.source)) {
      returnValue = this.source[this.end];
    }
    
    return returnValue;
  }

  get isForwardRange() {
    return 'popFront' in this;
  }

  get isBackwardsRange() {
    return 'popBack' in this;
  }

  get isBidirectionalRange() {
    return this.isForwardRange && this.isBackwardsRange;
  }
}

class ForwardRange extends Range {
  constructor(source, begin, end) {
    super(source, begin, end);
  }

  popFront() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.begin++;
  }
}

class BackwardsRange extends Range {
  constructor(source, begin, end) {
    super(source, begin, end);
  }

  popBack() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.end--;
  }
}

class BidirectionalRange extends Range {
  constructor(source, begin, end) {
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
  constructor(source, begin, end) {
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

class Stride extends ForwardRange {
  constructor(source, begin, end, step) {
    super(source, begin, end);
    this.step = step ?? 1;
  }

  popFront() {
    this.begin += this.step;

    if (this.source instanceof Range) {
      for (let iterations = 0; iterations < this.step; iterations++) {
        this.source.popFront();
      }
    }
  }

  empty() {
    if (this.source instanceof Range) return this.source.empty();
    return super.empty();
  }
}

class Iota extends Stride {
  constructor(begin, end = Infinity, step) {
    super([begin], 0, end - begin, step);
    this.step = step ?? 1;
  }

  popFront() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    const currentValue = this.front();
    this.begin++;
    if (this.source[this.begin] === undefined) this.source[this.begin] = currentValue + this.step;
  }

  empty() {
    return this.begin >= this.end;
  }
}

class Cycle extends ForwardRange {
  constructor(source) {
    if (!(source instanceof Range)) throw new Error('Cycle only works on ranges.');
    super(source, source.begin, source.end);
  }

  popFront() {
    this.begin++;
    if (this.begin >= this.end) {
      this.begin = 0;
      this.source.begin = 0;
    } else {
      this.source.popFront();
    }
  }
}

class Take extends ForwardRange {
  constructor(source, limit) {
    super(source, 0, limit);
  }
  
  popFront() {
    this.begin++;
    if (this.source instanceof Range) {
      this.source.popFront();
    }
  }

  empty() {
    return this.begin >= this.end;
  }
}

const each = (range, func) => {
  if (!(range instanceof Range)) throw new Error('Each takes a range as the first parameter.');
  if (typeof func !== 'function') throw new Error('Each takes a function as the second parameter.');
  for (; !range.empty(); range.popFront()) {
    func(range.front());
  }
}

const zip = (...sources) => new Zip(...sources);
const iota = (begin, end, step) => new Iota(begin, end, step);
const cycle = source => new Cycle(source);
const take = (range, number) => new Take(range, number);

console.log('Test 1 ====================');
const testSource = [1, '2', [3], {four: 4}, new Chain(), new RangeItem(6), 7, 8];
const testRange1 = new ForwardRange(testSource);
console.log(testRange1.front());
testRange1.popFront();
console.log(testRange1.front());

console.log('Test 2 ====================');
let testRange2 = new Retro(testSource);
console.log(testRange2.front());
testRange2.popFront();
console.log(testRange2.front());
testRange2 = testRange2.retro();
testRange2.popFront();
console.log(testRange2.front());
console.table({
  isForwardRange: testRange2.isForwardRange,
  isBackwardsRange: testRange2.isBackwardsRange,
  isBidirectionalRange: testRange2.isBidirectionalRange
});

console.log('Test 3 ====================');
const testRange3 = new Chain(
  new ForwardRange(testSource, 5),
  new ForwardRange(testSource, 2, 4),
  new ForwardRange(testSource)
);

each(testRange3, item => {
  console.log(item);
});

console.log('Test 4 ====================');
const testRange4 = new Zip(
  new ForwardRange(testSource),
  new Retro(testSource)
);

each(testRange4, ([item1, item2]) => {
  console.log(item1, item2);
});
  
console.log('Test 5 ====================');
const testRange5 = new Stride(
  new Chain(
    new ForwardRange(testSource, 5),
    new ForwardRange(testSource, 2, 4),
    new ForwardRange(testSource)
  ), 0, 0, 2
);

each(testRange5, item => {
  console.log(item, testRange5.begin);
});

console.log('Test 6 ====================');
const testRange6 = new Stride(testSource, 0, 0, 2);

each(testRange6, console.log);

console.log('Test 7 ====================');
const testIota = iota(0, 5);
console.log(testIota);
each(testIota, console.log);
console.log(take(iota(0, 5), 2));

console.log('Test 8 ====================');
const testTake = take(cycle(iota(3, 6)), 17);

each(testTake, console.log);

