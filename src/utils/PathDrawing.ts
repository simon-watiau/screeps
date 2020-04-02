const drawingOpts = (color: string) => {
  const style:PolyStyle = {
    fill: 'transparent',
    lineStyle: "dashed" ,
    opacity: .6,
    stroke: color,
    strokeWidth: .10,
  };

  return style;
};
export default drawingOpts;
