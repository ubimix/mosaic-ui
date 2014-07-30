(function(context) {
    var Mosaic = context.Mosaic;

    var html = [ '<div>', '<h3 data-render="renderTitle">abc</h3>',
            '<script>({',
            '   renderTitle: function(elm){ elm.html(this.options.msg); }',
            '})</script>', '</div>' ].join('\n');
    html = $(html);

    describe('Mosaic', function() {
        it('should be able to instantiate widgets and properly render them',
                function() {
                    var Type = Mosaic.TemplateView.extendViewType(html);
                    var view = new Type({
                        msg : 'Hello, world!'
                    });
                    var result = view.render();
                    expect(result).to.be(view);
                    expect(result.$el.html()).to.eql('<h3>Hello, world!</h3>');
                });
    });

})(this);
