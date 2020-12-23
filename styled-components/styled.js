const { serialize, compile, stringify } = stylis;
let counter = 0;
let styleTag = null;

const hash = (s) =>
  s.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

const styled = (TargetComponent) => (strs, ...exprs) => {
  counter++;
  const componentId = "sc-" + hash("sc" + counter);
  class StyledComponent extends React.Component {
    constructor(props) {
      super(props);
      const { className, evaluatedStyles } = this.interpolateStyles();
      this.injectStyles(className, evaluatedStyles);
      this.state = {
        generatedClassName: className,
      };
    }

    interpolateStyles() {
      const evaluatedStyles = exprs.reduce((result, expr, index) => {
        const isFunc = typeof expr === "function";
        const value = isFunc ? expr(this.props) : expr;

        return result + value + strs[index + 1];
      }, strs[0]);

      const className = "c-" + hash(componentId + evaluatedStyles);

      return { className, evaluatedStyles };
    }

    injectStyles(className, evaluatedStyles) {
      const selector = "." + className;
      const style = this.createOrGetStyleTag();
      if (!style.innerText.includes(selector)) {
        const cssStr = serialize(
          compile(`${selector}{${evaluatedStyles}}`),
          stringify
        );
        style.appendChild(document.createTextNode(cssStr));
      }
    }

    createOrGetStyleTag() {
      if (!styleTag) {
        const head = document.head || document.getElementsByTagName("head")[0];
        const style = document.createElement("style");
        head.appendChild(style);
        styleTag = style;
      }
      return styleTag;
    }

    componentDidUpdate() {
      const { className, evaluatedStyles } = this.interpolateStyles();
      if (className !== this.state.generatedClassName) {
        this.injectStyles(className, evaluatedStyles);
        this.setState({
          generatedClassName: className,
        });
      }
    }

    render() {
      const generatedClassName = this.state.generatedClassName;
      const className = this.props.className || "";
      return (
        <TargetComponent
          {...this.props}
          className={className + " " + componentId + " " + generatedClassName}
        />
      );
    }
  }

  return StyledComponent;
};

styled.button = styled("button");
styled.span = styled("span");

window.styled = styled;
