chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  console.log(sender.tab ?
              "from a content script:" + sender.tab.url :
              "from the extension");
  alert(sender.tab);
  if (request.greeting == "hello") {
    sendResponse({farewell: "goodbye"});
  } else {
    sendResponse({}); // snub them.
  }
});

var getRequests = function () {
  var requests = localStorage.getItem('requests');

  if (requests) {
    requests = JSON.parse(requests);
  } else {
    requests = [];
    localStorage.setItem('requests', JSON.stringify(requests));
  }

  return requests;
};
var addRequest = function (request) {
  var requests = getRequests();
  requests.push(request);
  localStorage.setItem('requests', JSON.stringify(requests));
};
var setRequests = function (requests) {
  localStorage.setItem('requests', JSON.stringify(requests));
};
var clearRequests = function () {
  localStorage.removeItem('requests');
};

var renderList = function (dom, requests) {
  if (dom && dom.length) {
    var lists = requests.map(function (item) {
      return '<li><span>' + item.method + '</span><span>' + item.url + '</span></li>';
    }).join('');
    dom.html(lists);
  }
};

var callback = function (request) {
    console.log(request);
    addRequest(request);
    renderList($('#requests-list'), getRequests());
};
var optFilter = {
    urls: ['<all_urls>']
  };
var optExtraInfo = ["blocking"];

chrome.webRequest.onBeforeRequest.addListener(callback, optFilter, optExtraInfo);

renderList($('#requests-list'), getRequests());

// document.addEventListener('DOMContentLoaded', function() {
  
  var requestList = $('#requests-list');
  // var callback = function (request) {
  //   console.log(request);
  //   addRequest(request);
  //   renderList(getRequests());
  // };
 
  // var optFilter = {
  //   urls: ['<all_urls>']
  // };
  // var optExtraInfo = ["blocking"];

  // chrome.webRequest.onBeforeRequest.addListener(callback, optFilter, optExtraInfo);



  renderList(requestList, getRequests());


  var clearBtn = $('#clear-list');

  clearBtn.on('click', function () {
    clearRequests();
    renderList(requestList, getRequests());
  });

  
// }, false);