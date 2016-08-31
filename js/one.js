/**
 * Created by rileyxia on 16/8/24.
 */

(function($) {
    var $window = $(window), $body = $('body');
    var transform_effect_support = css_supports('transform'); //css3 transform support
    var switch_timer = null, switch_time = 500;
    var wheeldeltaY = 0, mousedeltaY = 0, wheelTimer = null, wheelTime = 50;
    var stage_freeze = false, wheelLock = false;
    var is_mobile = !!navigator.userAgent.match(/iphone|ipod|ipad|mobile|android/i);

    var $section_layout = $('[data-xdonepage-container]:eq(0)');
    var $sections = $body.find($section_layout.data('xdonepage-item'));
    var current_section_index = $section_layout.data('xdonepage-index') || 0, max_section_index = $sections.length - 1;

    //函数节流
    var throttle = function (fn, delay, mustRunDelay) {
        var timer = null;
        var t_start;
        return function () {
            var context = this, args = arguments, t_curr = +new Date();
            clearTimeout(timer);
            if (!t_start) {
                t_start = t_curr;
            }
            if (t_curr - t_start >= mustRunDelay) {
                fn.apply(context, args);
                t_start = t_curr;
            }
            else {
                timer = setTimeout(function () {
                    fn.apply(context, args);
                }, delay);
            }
        };
    };

    if(max_section_index < 0) return false;
    function css_supports(prop){ //css support checker
        var div = document.createElement('div'),
            vendors = 'Khtml O Moz Webkit'.split(' '),
            len = vendors.length;

        if ( prop in div.style ) return true;
        if ('-ms-' + prop in div.style) return true;
        prop = prop.replace(/^[a-z]/, function(val) {
            return val.toUpperCase();
        });
        while(len--) {
            if ( vendors[len] + prop in div.style ) {
                return true;
            }
        }
        return false;
    }

    function get_offset_matrix(x, y){ //get transform css
        var x = (typeof x === 'undefined') ? 0 : x,
            y = (typeof y === 'undefined') ? 0 : y;
        var val = 'matrix(1, 0, 0, 1,'+ x +', ' + y + ')';
        return {
            'transform'         : val
        }
    }

    function on_switch_section(index){
        index = Math.max(0, Math.min(max_section_index, index));
        var $item = $sections.eq(index);
        var offset = $item.position().top * -1 - $item.outerHeight() + $window.height();
        stage_freeze = true;
        if (switch_timer != null) {
            clearTimeout(switch_timer);
        }
        $section_layout.trigger('switchStart.xd.onepage', index);
        move_section(offset);
        switch_timer = setTimeout(function(){
            stage_freeze = false;
            $section_layout.trigger('switchEnd.xd.onepage', [index, current_section_index]); //滚动到当前屏时触发
            current_section_index = index;
            $section_layout.data('xdonepage-index', index);
            switch_timer = null;
        }, switch_time);
    }

    function move_section(offset){
        if(transform_effect_support) {
            $section_layout.css(get_offset_matrix( 0, offset));
        } else {
            $section_layout.stop().animate({top: offset}, switch_time);
        }
    }

    //切换页面
    $section_layout.on('switchTo.xd.onepage', function(e, index, force){
        index = Math.max(0, Math.min(max_section_index, index));
        if(!force){
            if(index == current_section_index || stage_freeze) return false;
        }
        on_switch_section(index);
    })

    $('[data-xdonepage-to]').on('click', function(){
        var index = $(this).data('xdonepage-to') - 1;
        $section_layout.trigger('switchTo.xd.onepage', index);
        return false;
    });

    if(!is_mobile){
        //输入框监测事件
        $body.on('keydown', function(e){//37-left, 38-up, 39-right, 40-down
            var key = e.keyCode;
            if(key == 37 || key == 38) {
                $section_layout.trigger('switchTo.xd.onepage', current_section_index - 1);
                return false;
            } else if(key == 39 || key == 40) {
                $section_layout.trigger('switchTo.xd.onepage', current_section_index + 1);
                return false;
            }
        })

        $(document).on('mousewheel', throttle(function(e){
            if(!stage_freeze){
                clearTimeout(wheelTimer);
                wheeldeltaY += e.deltaFactor * e.deltaY * 0.3;
                if(Math.abs(wheeldeltaY) > 2){
                    var index = current_section_index + (wheeldeltaY > 0 ? -1 : 1);
                    $section_layout.trigger('switchTo.xd.onepage', index);
                    wheeldeltaY = 0;
                }

                wheelTimer = setTimeout(function(){ // wheel end
                    wheelTimer = null
                    wheeldeltaY = 0;
                }, wheelTime);
            }
        }, 100, 300));
    } else {//mobile touch event
        var touchStartX, touchStartY, delta = {};
        $('body').on('touchstart', function(event){
            if('undefined' !== typeof event.originalEvent && !stage_freeze){
                var touch = event.originalEvent.touches[0];
                touchStartX = touch.pageX;
                touchStartY = touch.pageY;
                delta = {};
                $section_layout.trigger('touchStart.xd.onepage');
                $section_layout.addClass('on-touch');
            }
        }).on('touchmove', function(event){
            if('undefined' !== typeof event.originalEvent && !stage_freeze){
                event.preventDefault();
                var touches = event.originalEvent.touches[0];
                delta = {
                    x: touches.pageX - touchStartX,
                    y: (touches.pageY - touchStartY)/3 - $sections.eq(current_section_index).position().top
                }
                $section_layout.css(get_offset_matrix(0, delta.y));
            }
        }).on('touchend', function(event){
            if('undefined' !== typeof event.originalEvent && !stage_freeze){
                var touch = event.originalEvent.changedTouches[0];
                var touchEndX = touch.clientX,
                    touchEndY = touch.clientY;
                var dx = touchEndX - touchStartX,
                    dy = touchEndY - touchStartY,
                    absDx = Math.abs(dx),
                    absDy = Math.abs(dy);
                $section_layout.trigger('touchEnd.xd.onepage');
                $section_layout.removeClass('on-touch');
                try{
                    if(absDy <= 100) throw(-2);
                    if(current_section_index == max_section_index && dy < 0) throw(-3);
                    if(dy > 0 && current_section_index == 0) throw(-3);

                    $section_layout.trigger('switchTo.xd.onepage', current_section_index + 1 * (dy > 0 ? -1 : 1));
                }catch(e){
                    // -1: 滑动距离过窄
                    // -2: 滑动距离过短
                    // -3: 已到底部或顶部，无法继续
                    if(e == -2 || e == -3){
                        $section_layout.css(get_offset_matrix(0, -1 * $sections.eq(current_section_index).position().top)); //归位
                    }
                }
            }
        });
    }
})(window.jQuery);