'use strict';

// Given a Container of some description, you should be able to zip
// any number of sources in the Container.

// Exclusive range.
class NumberRange {
  constructor(start, end) {
    this.start = start;
    this.end = end;
    this.direction = Math.sign(this.end - this.start);
  
    return new Proxy(this, {
      has(target, prop) {
        return prop >= target.start && prop <= target.end;
      },
      get(target, prop) {
        try {
          if (prop === 'length') return target.end - target.start;

          if (prop in target) return target[prop];

          const parsedProp = parseInt(prop, 10);
          if (!Number.isNaN(parsedProp)) {
            const result = parsedProp + target.start;
            if (result >= target.direction * target.end || result < target.direction * target.start) {
              return null;
            }
            return result;
          } else {
            throw new Error(`No case for prop named ${prop}. Throwing.`);
          }
        } catch (error) {
          console.error(error);
        }
      }
    });
  }
  
  getBounds() {
    return [this.start, this.end];
  }

  *[Symbol.iterator]() {
    if (this.end !== this.start) {
      for (let index = this.start; this.direction == 1 ? index < this.end : index > this.end; index += this.direction) {
        yield index;
      }
    } else {
      yield null;
    }
  }
  
  getValue() {
    return [...this];
  }

}

class Container {
  constructor() {
    this.sources = [];
    this.value = null;
  }

  addSources(...sources) {
    this.sources.push(sources);
    return this;
  }
  
  addNumberRange(start, end) {
    this.sources.push(new NumberRange(start, end));
    return this;
  }

  zip() {
    // Zips longest. Pushes `null` if item doesn't exist.

    let numberOfSources = 0;
    let largestSourceLength = 0;

    for (let index = 0; index < this.sources.length; index++) {
      numberOfSources += 1;
      largestSourceLength = largestSourceLength < this.sources[index].length ? this.sources[index].length : largestSourceLength;
    }

    let zippedItems = [];
    const newValue = [];
    
    for (let index = 0; index < largestSourceLength; index++) {
      for (let sourceNumber = 0; sourceNumber < numberOfSources; sourceNumber++) {
        zippedItems.push(this.sources[sourceNumber][index] ?? null);
      }

      newValue.push(zippedItems);
      zippedItems = [];
    }

    this.value = newValue;
    return this;
  }
}

const testCase1 = new NumberRange(1, 10);
console.log(testCase1.getBounds());
console.log([...testCase1]);
console.assert(5 in testCase1, "5 isn't between 1 and 10?");
console.assert(-1 in testCase1 === false, "-1 is between 1 and 10?");
console.assert(-1 in new NumberRange(-1, 10), "-1 isn't between -1 and 10?");
// testCase1.forEach(console.log);

const testCase2 = new Container().addNumberRange(-10, -1).addNumberRange(1, 10).addNumberRange(11, 20).addNumberRange(21, 30);
console.log(testCase2.sources);

console.log(testCase2.zip().value);
