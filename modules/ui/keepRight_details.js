import { t } from '../util/locale';
import { parseErrorDescriptions, errorTypes } from '../util';
import { select as d3_select } from 'd3-selection';


export function uiKeepRightDetails(context) {
    var _error;
    var _template;
    var _templateErrorType;
    var _category;
    var _categoryElements;
    var _parent_error_type = '';
    var _titleBase;


    function initDetails() {
        if (errorTypes.errors['_' + _error.error_type]) {
            _templateErrorType = '_' + _error.error_type;
            _template = errorTypes.errors[_templateErrorType];
            _category = 'errors';
        } else if (errorTypes.warnings[_templateErrorType]) {
            _template = errorTypes.warnings[_templateErrorType];
            _category = 'warnings';
        } else { return; }

        // if there is a parent, save it's error type
        _categoryElements = errorTypes[_category];
        var base_error_type = (Math.round(_error.error_type / 10) * 10).toString();
        if ((_categoryElements['_' + base_error_type]) && (base_error_type !== _error.error_type) ) {
            _parent_error_type = '_' + base_error_type;
        }

        _titleBase = 'QA.keepRight.errorTypes.' + _category + '.';

    }


    function keepRightDetails(selection) {
        if (!_error || !_error.error_type) return;

        initDetails();
        if (!_template) return;


        var details = selection.selectAll('.kr_error-details')
            .data(
                (_error ? [_error] : []),
                function(d) { return d.status + d.id; }
            );

        details.exit()
            .remove();

        var detailsEnter = details.enter()
            .append('div')
            .attr('class', 'kr_error-details kr_error-details-container');


        // title
        var title = detailsEnter
            .append('div')
            .attr('class', 'kr_error-details-title');

        title.append('h4')
            .text(function() { return t('QA.keepRight.detail_title'); });

        title.append('div')
            .text(function() {
                var title = '';

                // if this is a subtype, append it's parent title
                if (_parent_error_type) {
                    title = t(_titleBase + _parent_error_type + '.description') + ': \n';
                }

                // append title
                if (_error.error_type) {
                    title += t(_titleBase + _templateErrorType + '.description');
                }

                return title;
            });


        // description
        var description = detailsEnter
            .append('div')
            .attr('class', 'kr_error-details-description');

        description
            .append('h4')
            .text(function() { return t('QA.keepRight.detail_description'); });

        description
            .append('div')
            .attr('class', 'kr_error-details-description-text')
            .text(function(d) {
                return t(_titleBase + _templateErrorType + '.tooltip', parseErrorDescriptions(d));
            });

        // var description_text = d3_select('.kr_error-details-description-text').text();
        // TODO: add links to ids in description
        // d3_select('.kr_error-details-description-text').enter()
        //     .append('span')
        //     .append('a')
        //     .text(function(d) { return d.object_id; })
        //     .on('click', function() { console.log('hi'); });

    }


    keepRightDetails.error = function(_) {
        if (!arguments.length) return _error;
        _error = _;
        return keepRightDetails;
    };


    return keepRightDetails;
}
