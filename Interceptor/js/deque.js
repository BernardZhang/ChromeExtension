/* A simple deque [double-ended queue] library in Javascript
 * 
 * Constructor uses an optional max-size
 * 
 * Methods: 
 * push(item) -> Adds an item in the queue
 * dequeue -> Pops the last item from the back and return it
 */
function Deque(N) {
  this._maxlength = N;
  this.items = new Array();
  localStorage.setItem('items', JSON.stringify(this.items));
  this.clear = function() {
      this.items = [];
      localStorage.removeItem('items');
  }
}

Deque.prototype.dequeue = function() {
  var item = this.items.pop();
  localStorage.setItem('items', JSON.stringify(this.items));
  return item;
}

Deque.prototype.push = function(item) {
  this.items.unshift(item);
  localStorage.setItem('items', JSON.stringify(this.items));
  if (this.items.length > this._maxlength) {
    this.dequeue();
  }
}
