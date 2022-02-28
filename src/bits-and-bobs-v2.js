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
  constructor(range) {
    if (!(range instanceof Range)) throw new Error('Retro only works on ranges.');
    super(range, range.begin, range.end);
    this.originalRange = range;
  }

  front() {
    let returnValue = null;
    if (this.source instanceof Range) {
      returnValue = this.source.back();
    }
    
    if (isIterable(this.source)) {
      returnValue = this.source[this.end];
    }
    
    return returnValue;
  }

  back() {
    let returnValue = null;
    if (this.source instanceof Range) {
      returnValue = this.source.back();
    }
    
    if (isIterable(this.source)) {
      returnValue = this.source[this.begin];
    }
    
    return returnValue;
  }
  
  popFront() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.end--;
    if (this.source.isBackwardsRange) {
        this.source.popBack();
    }
  }

  popBack() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    this.begin++;
    if (this.source.isForwardRange) {
        this.source.popFront();
    }
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
  constructor(range, step) {
    if (!(range instanceof Range)) throw new Error('Stride only works on ranges.');
    super(range, range.begin, range.end);
    this.step = step ?? 1;
  }

  popFront() {
    this.begin += this.step;

    if (this.source instanceof Range) {
      for (let iterations = 0; (iterations < this.step) && !this.source.empty(); iterations++) {
        this.source.popFront();
      }
    }
  }

  empty() {
    if (this.source instanceof Range) return this.source.empty();
    return super.empty();
  }
}

class GeneratedRange extends ForwardRange {
  constructor(genFunc) {
    super([], 0, 0);
    const thisRange = this;
    thisRange.generator = (function* (genFunc) {
      let iterations = 0;
      while (true) {
        yield genFunc([thisRange, iterations++]);
      }
    })(genFunc);
    this.source.push(this.generator.next().value);
    this.end++;
  }

  popFront() {
    this.begin++;
    if (this.front() === undefined) {
      this.source.push(this.generator.next().value);
      this.end++;
    }
  }
}

class Iota extends ForwardRange {
  constructor(begin, end = Infinity, step) {
    // super([_, iterations] => begin + (iterations - 1));
    super([begin], 0, end - begin, step);
    this.step = step ?? 1;
  }

  popFront() {
    if (this.empty()) throw new Error('Cannot advance an exhausted range.');
    const currentValue = this.front();
    this.begin++;
    if (this.source[this.begin] === undefined) this.source[this.begin] = currentValue + this.step;
  }
}

class Cycle extends ForwardRange {
  constructor(range) {
    if (!(range instanceof Range)) throw new Error('Cycle only works on ranges.');
    super(range, range.begin, range.end);
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

const find = (range, value) => {
  if (!(range instanceof Range)) throw new Error('Find takes a range as the first parameter.');
  if (typeof value === 'object') console.warn('Doing an equality check on a non-primitive might yield incorrect results.');
  for (; !range.empty(); range.popFront()) {
    if (range.front() === value) break;
  }
  return range;
}

const retro = range => new Retro(range);
const cycle = range => new Cycle(range);
const chain = (...sources) => new Chain(...sources);
const zip = (...sources) => new Zip(...sources);
const take = (range, number) => new Take(range, number);
const stride = (range, step) => new Stride(range, step);
const iota = (begin, end, step) => new Iota(begin, end, step);
const generate = genFunc => new GeneratedRange(genFunc);

console.log('Test 1 ====================');
const testSource = [1, '2', [3], {four: 4}, new Chain(), new RangeItem(6), 7, 8];
const testRange1 = new ForwardRange(testSource);
console.log(testRange1.front());
testRange1.popFront();
console.log(testRange1.front());

console.log('Test 2 ====================');
let testRange2 = retro(new BidirectionalRange(testSource));
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
const testRange3 = chain(
  new ForwardRange(testSource, 5),
  new ForwardRange(testSource, 2, 4),
  new ForwardRange(testSource)
);

each(testRange3, item => {
  console.log(item);
});

console.log('Test 4 ====================');
const testRange4 = zip(
  new ForwardRange(testSource),
  retro(new ForwardRange(testSource))
);

each(testRange4, ([item1, item2]) => {
  console.log(item1, item2);
});
  
console.log('Test 5 ====================');
const testChain5 = chain(
  new ForwardRange(testSource, 5),
  new ForwardRange(testSource, 2, 4),
  new ForwardRange(testSource)
);
const testRange5 = stride(testChain5, 2);

each(testRange5, item => {
  console.log(item, testRange5.begin);
});

console.log('Test 6 ====================');
const testRange6 = stride(new ForwardRange(testSource), 2);
each(testRange6, console.log);

console.log('Test 7 ====================');
const testIota = iota(0, 5);
console.log(testIota);
each(testIota, console.log);
const testIota2 = take(iota(0, 5), 2);
each(testIota2, console.log);

console.log('Test 8 ====================');
const testTake = take(cycle(iota(3, 6)), 17);
each(testTake, console.log);

console.log('Test 9 ====================');
const testIota3 = iota(0, 20);
console.log(find(testIota3, 7));

console.log('Test 10 ====================');
const testRange7 = generate(([range]) => range.begin);
each(take(testRange7, 20), console.log);
