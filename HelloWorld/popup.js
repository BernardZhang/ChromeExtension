document.addEventListener('DOMContentLoaded', function() {
  var checkPageButton = document.getElementById('checkPage');

  checkPageButton.addEventListener('click', function() {

    chrome.tabs.getSelected(null, function(tab) {
      d = document;

      var f = d.createElement('form');
      // f.action = 'http://gtmetrix.com/analyze.html?bm';
      f.action = 'http://baidu.com';
      f.method = 'post';
      var i = d.createElement('input');
      i.type = 'hidden';
      i.name = 'url';
      i.value = tab.url;
      f.appendChild(i);
      d.body.appendChild(f);
      f.submit();
    });
  }, false);

  $(checkPageButton).on('click', function (e) {
    $.ajax({
      url: 'http://google.com',
      type: 'GET'
    }).complete(function (response) {
      console.log(arguments);
      // $(document.body).append(response);
      // alert(1);
    });

  });
}, false);