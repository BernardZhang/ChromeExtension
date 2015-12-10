var backgroundPort = chrome.runtime.connect({ name: 'background' });

// 监听扩展连接事件
chrome.runtime.onConnect.addListener(function (port) {
	console.log('connect port name:' + port.name);

	backgroundPort.postMessage({
		name: 'background',
		msg: 'hello'
	});

	port.onMessage.addListener(function (msg) {
		console.log('onMessage:', msg);
	});
});

// 监听请求发出前事件
chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
	urls: ['<all_urls>']
}, [ 'blocking' ]);

chrome.tabs.getSelected(null, function(tab) {
	chrome.tabs.sendRequest(tab.id, {
		greeting: 'hello'
	}, function (response) {
		// console.log(response.farewell);
		console.log(response);
	});
});

function onBeforeRequest(request) {
	console.log('onBeforeRequest', request);
	backgroundPort.postMessage(request);
}