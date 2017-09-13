import React, { PureComponent, PropTypes } from 'react';
import { View, Text, Image, ViewPropTypes } from 'react-native';
import ViewTransformer from 'react-native-view-transformer';

export default class TransformableImage extends PureComponent {
    static propTypes = {
        source: PropTypes.oneOfType([
            PropTypes.shape({ uri: PropTypes.string.isRequired }),
            PropTypes.number
        ]).isRequired,
        style: ViewPropTypes ? ViewPropTypes.style : View.propTypes.style,
        onLoad: PropTypes.func,
        onLoadStart: PropTypes.func,
        dimensions: PropTypes.shape({
            width: PropTypes.number,
            height: PropTypes.number
        }),
        enableTransform: PropTypes.bool,
        enableScale: PropTypes.bool,
        enableTranslate: PropTypes.bool,
        onTransformGestureReleased: PropTypes.func,
        onViewTransformed: PropTypes.func,
        imageComponent: PropTypes.func,
        resizeMode: PropTypes.string,
        errorComponent: PropTypes.func
    };

    static defaultProps = {
        enableTransform: true,
        enableScale: true,
        enableTranslate: true,
        imageComponent: undefined,
        resizeMode: 'contain'
    };

    constructor (props) {
        super(props);

        this.onLayout = this.onLayout.bind(this);
        this.onLoad = this.onLoad.bind(this);
        this.onLoadStart = this.onLoadStart.bind(this);
        this.getViewTransformerInstance = this.getViewTransformerInstance.bind(this);
        this.renderError = this.renderError.bind(this);

        this.state = {
            viewWidth: 0,
            viewHeight: 0,
            imageLoaded: false,
            imageDimensions: props.source.dimensions,
            keyAcumulator: 1
        };
    }

    componentWillMount () {
        if (!this.state.imageDimensions) {
            this.getImageSize(this.props.source);
        }
    }

    componentDidMount () {
        this._mounted = true;
    }

    componentWillReceiveProps (nextProps) {
        if (!sameSource(this.props.source, nextProps.source)) {
            // image source changed, clear last image's imageDimensions info if any
            this.setState({ imageDimensions: nextProps.source.dimensions, keyAcumulator: this.state.keyAcumulator + 1 });
            if (!nextProps.source.dimensions) { // if we don't have image dimensions provided in source
                this.getImageSize(nextProps.source);
            }
        }
    }

    componentWillUnmount () {
        this._mounted = false;
    }

    onLoadStart (e) {
        this.props.onLoadStart && this.props.onLoadStart(e);
        if (this.state.imageLoaded) {
            this.setState({ imageLoaded: false });
        }
    }

    onLoad (e) {
        this.props.onLoad && this.props.onLoad(e);
        if (!this.state.imageLoaded) {
            this.setState({ imageLoaded: true });
        }
    }

    onLayout (e) {
        let {width, height} = e.nativeEvent.layout;
        if (this.state.viewWidth !== width || this.state.viewHeight !== height) {
            this.setState({ viewWidth: width, viewHeight: height });
        }
    }

    getImageSize (source) {
        if (!source) {
            return;
        }
        const { dimensions } = this.props;

        if (dimensions) {
            this.setState({ imageDimensions: dimensions });
            return;
        }

        if (source && source.uri) {
            Image.getSize(
                source.uri,
                (width, height) => {
                    if (width && height) {
                        if (this.state.imageDimensions && this.state.imageDimensions.width === width && this.state.imageDimensions.height === height) {
                            // no need to update state
                        } else {
                            this._mounted && this.setState({ imageDimensions: { width, height } });
                        }
                    }
                },
                () => {
                    this._mounted && this.setState({ error: true });
                }
            );
        } else {
            console.warn('react-native-image-gallery', 'Please provide dimensions of your local images');
        }
    }

    getViewTransformerInstance () {
        return this.refs['viewTransformer'];
    }

    renderError () {
        return (this.props.errorComponent && this.props.errorComponent()) || (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                 <Text style={{ color: 'white', fontSize: 15, fontStyle: 'italic' }}>This image cannot be displayed...</Text>
            </View>
        );
    }

    render () {
        const { imageDimensions, viewWidth, viewHeight, error, keyAccumulator, imageLoaded } = this.state;
        const { style, imageComponent, resizeMode, enableTransform, enableScale, enableTranslate, onTransformGestureReleased, onViewTransformed } = this.props;

        let maxScale = 1;
        let contentAspectRatio;
        let width, height; // imageDimensions

        if (imageDimensions) {
            width = imageDimensions.width;
            height = imageDimensions.height;
        }

        if (width && height) {
            contentAspectRatio = width / height;
            if (viewWidth && viewHeight) {
                maxScale = Math.max(width / viewWidth, height / viewHeight);
                maxScale = Math.max(1, maxScale);
            }
        }

        const imageProps = {
            ...this.props,
            style: [style, { backgroundColor: 'transparent' }],
            resizeMode: resizeMode,
            onLoadStart: this.onLoadStart,
            onLoad: this.onLoad,
            capInsets: { left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 }
        };

        const image = imageComponent ? imageComponent(imageProps) : <Image { ...imageProps } />;

        return (
            <ViewTransformer
              ref={'viewTransformer'}
              key={'viewTransformer#' + keyAccumulator} // when image source changes, we should use a different node to avoid reusing previous transform state
              enableTransform={enableTransform && imageLoaded} // disable transform until image is loaded
              enableScale={enableScale}
              enableTranslate={enableTranslate}
              enableResistance={true}
              onTransformGestureReleased={onTransformGestureReleased}
              onViewTransformed={onViewTransformed}
              maxScale={maxScale}
              contentAspectRatio={contentAspectRatio}
              onLayout={this.onLayout}
              style={style}>
                { error ? this.renderError() : image }
            </ViewTransformer>
        );
    }
}

function sameSource (source, nextSource) {
    if (source === nextSource) {
        return true;
    }
    if (source && nextSource) {
        if (source.uri && nextSource.uri) {
            return source.uri === nextSource.uri;
        }
    }
    return false;
}
