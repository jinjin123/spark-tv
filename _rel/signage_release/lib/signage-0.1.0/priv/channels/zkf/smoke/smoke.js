 function smoke_div(ele, left, bottom, width, height, cct, speed) {
    var ret = {},
        stp = false;
    left = parseInt(left, 10);
    bottom = parseInt(bottom, 10);
    width = parseInt(width, 10);
    if (width > 250) { width = width - 250;}
    height = parseInt(height, 10) + bottom;
    cct = parseInt(cct, 10);
    speed = parseInt(speed, 10) / 10;
    ret.play = function(){
        stp = false;
        var a = 0;
        for (; a < cct; a += 1) {
            setTimeout(function b() {
                var t = (Math.random() * 1e3 + 5e3) * speed,
                c = $("<div />", {
                        class: "smokeforlib",
                        css: {opacity: 0,left: Math.random() * width + left, bottom: bottom}
                    });
                $(c).appendTo(ele);
                $.when($(c).animate({opacity: 1}, {
                    duration: t / 2,
                    easing: "linear",
                    queue: false,
                    complete: function () {
                      //$(c).animate({opacity: 0}, {duration: t / 3, easing: "linear", queue: false})
                  }}),

                $(c).animate({bottom: height}, {
                    duration: t,
                    easing: "linear",
                    queue: false})).then(function () {
                        $(c).remove();
                        if (stp === false){
                            b();
                        } else {
                            c = null;   
                        }
                })
            }, Math.random() * 9e3);
        }
     };
     ret.stop = function(){
        stp = true;
     };
     return ret;
}