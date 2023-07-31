
function _1(md){return(
md`# Circulo de las Quintas

Haga clic en un acorde para obtener sus acordes coincidentes (en la escala del acorde raíz en el que hizo clic) y sus grados correspondientes`
)}

function _drawCircle(d3,circleWidth,innerRadius,notes,activeNotesFillColor){return(
(() => {
  const circleSvg = d3
    .create('svg')
    .attr('width', circleWidth)
    .attr('height', circleWidth)
    .attr('viewBox', `-${circleWidth / 2} -${circleWidth / 2} ${circleWidth} ${circleWidth}`);
    // .attr('viewBox', `-${circleWidth / 2} -${circleWidth / 2} ${circleWidth / 2} ${circleWidth / 2}`) ;
  
  const radius = circleWidth / 2;
  const sliceThickness = radius / 3 - innerRadius;
  // we have 12 slices of the circle for the 12 notes so a slice is 2 * Math.PI / 12, hence Math.PI / 6
  const sliceAngle = Math.PI / 6; 
  const root = circleSvg.append('g');
  
  const toCartesian = (a, r) => ({
    x: Math.cos(a) * r,
    y: Math.sin(a) * r,
  });
  
  /* 
   * Returns the slice's pseudo rectangle coordinates as well as the inner and outer radius of this rectangle
   */
  const sliceCoordinates = (node) => {
    const { index, row } = node;
     // start angle relative to top of the circle in polar coordinates.
    const a1 = index * sliceAngle - (Math.PI / 2) + (Math.PI / 12); 
    
    // end angle, navigating clockwise
    const a2 = a1 - sliceAngle;
    
    // outer radius
    const r1 = radius - (row * sliceThickness);
    
    // inner radius
    const r2 = r1 - sliceThickness;
    
    // so our shape is a 4 coordinates slice of a donut, start
    return [[
      toCartesian(a1, r1),
      toCartesian(a2, r1),
      toCartesian(a2, r2),
      toCartesian(a1, r2)
    ], [ r1, r2 ]]; 
  };
  
  /* Degree goes from 1 to 12 */
  const degreeAsRoman = (degree) => {
    const nums = [ 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII' ];
    return nums[degree - 1];
  };
  
  
  const getScale = (root, major = true) => {
    // base scale in terms of semi tones relative to the root note
    let scale = [];
     
    if (major) {
      scale = [ 0, 2, 4, 5, 7, 9, 11 ]; 
    } else {
      scale = [0, 2, 3, 5, 7, 8, 10];
    }
    
    // relative to C
    return scale.map((semiTones, i) => {
      let note = (root + semiTones) % 12;
      note = note === 0 ? 12 : note;
      return {
        degree: i + 1,
        note,
      };
    });
  }
  
  const sliceCenter = (node) => {
    const [coords] = sliceCoordinates(node);
    
    
    const xCoords = coords.map(d => d.x);
    const yCoords = coords.map(d => d.y);
    
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    
    const center = {
      x: minX + ((maxX - minX) / 2),
      y: minY + ((maxY - minY) / 2),
    };
    return center;
  };
  
  const nextIndex = (index) => index === 11 ? 0 : index + 1;
  const previousIndex = (index) => index === 0 ? 11 : index - 1;
  
  
  const isActive = (d, index) => {
    return (
      (
        d.index === index
      ) || (
        d.index === nextIndex(index) && (d.row === 0 || d.row === 1)
      ) || (
        d.index === previousIndex(index) && (d.row === 0 || d.row === 1)
      )
    );
  };
  
  const filterActiveNotes = (index) => (d) => isActive(d, index);
 
  /*
   * For a given index (or note, 0 being C), and row (or position in the circle, 0 being the most outer position)
   * will return the corresponding SVGPath string. 
   */
  const slicePath = (node) => {
    const [[ c1, c2, c3, c4 ], [r1, r2] ] = sliceCoordinates(node);
    
    return `
      M ${c1.x} ${c1.y}
      A ${r1} ${r1} 0 0 0 ${c2.x} ${c2.y}
      L ${c3.x} ${c3.y}
      A ${r2} ${r2} 0 0 1 ${c4.x} ${c4.y}`;
   }
  
  let index = 0;
  
  let data = d3
    .range(3)
    .map(() => d3.range(12))
    .flatMap(
      (data, row) => 
        data
        .map(index => {
          const note = notes[row][index];
          return {
            ...note,
            row,
            index,
            active: false,
          };
        })).map((d, i) => ({ ...d, id: i }));
  
  
  const changeActiveIndex = (_data, index) => {
    return _data.filter(filterActiveNotes(index))
  }
  
  const handleClick = (update) => (
    function() {
      const datum = d3.select(this).data()[0];
      
      if (!datum) {
        console.error('datum is undefined');
        return;
      }

      let root = datum.note;
      
      const majorScale = datum.row !== 1;
      
      if (datum.row === 2) {
        root = data.find(d => d.row === 0 && d.index === datum.index).note;
      }
      
      const scale = getScale(root, majorScale);
      
      const newData = data.map(d => {
        const inScaleNote = scale.find(n => n.note === d.note);
        
        return {
          ...d,
          active: isActive(d, datum.index),
          degree: inScaleNote ? inScaleNote.degree : undefined,
        };
      });
    
      update(newData, datum.index);
    }
  );
  
  const degreeName = (activeIndex) => {
    return (d) => {
      if (d.index === activeIndex && d.row === 0) {
        return 'I';
      }
      
      if (d.index === previousIndex(activeIndex) && d.row === 1) {
        return 'II';
      }
      
      if (d.index === nextIndex(activeIndex) && d.row === 1) {
        return 'III';
      }
      
      if (d.index === previousIndex(activeIndex) && d.row === 0) {
        return 'IV';
      }
      
      if (d.index === nextIndex(activeIndex) && d.row === 0) {
        return 'V';
      }
    };
  };

  const run = (_data, activeIndex) => {
    const t = root.transition().duration(300);
    
    const chordsUpdate = root
      .selectAll('g.chord')
      .data(_data, d => d.id)
      .classed('active', d => d.active);
    
    // update chords font color
    chordsUpdate
      .call(update => {
        const tr = update.transition(t);
        tr.select('text.chord-name')
          .attr('fill', (d) => {
            return d.active ? '#333' : '#ababab';
          });
      
      tr.select('path')
        .attr('fill', (d) => d.active ? activeNotesFillColor : 'rgba(0,0,0,0)');
      
      tr.select('text.degree')
        .attr('fill-opacity', d => d.active ? 1 : 0)
        .text(d => d.active ? degreeAsRoman(d.degree) : '');
    });

    const chordsEnter = chordsUpdate.enter()
      .append('g')
      .classed('chord', true)
      .style('cursor', 'pointer');
     
    // chords slices path
    chordsEnter
        .append('path')
        .attr('fill', 'transparent')
        .attr('fill-opacity', 0.5)
        .attr('stroke-width', 1)
        .attr('stroke', '#333')
        .attr('d', (d) => slicePath(d))
        .on('click', handleClick(run))
        .attr('fill', 'transparent');
  
    // chords names
    chordsEnter
        .append('text')
        .classed('chord-name', true)
        .attr('text-anchor', 'middle')
        .attr('fill', '#333')
        .attr('x', (d) => sliceCenter(d).x)
        .attr('y', (d) => sliceCenter(d).y)
        .attr('font-size', '1.2em')
        .text(d => d.text)
        .on('click', handleClick(run));
    
    chordsEnter.append('text')
      .classed('degree', true)
      .attr('x', (d) => sliceCenter(d).x)
      .attr('y', (d) => sliceCenter(d).y)
      .attr('dx', 10)
      .attr('dy', -30)
      .attr('font-size', '0.8em')
      .attr('fill', '#777')
      .attr('text-anchor', 'middle')
      .text(d => d.active ? degreeAsRoman(d.degree) : '');
    
    chordsUpdate.exit().remove();
  };
 
  run(data);
  
  return circleSvg.node();
})()
)}

function _notes(){return(
[
  [
    { text: 'C', note: 1  },
    { text: 'G', note: 8  },
    { text: 'D', note: 3  },
    { text: 'A', note: 10  },
    { text: 'E', note: 5  },
    { text: 'B', note: 12 },
    { text: 'F#', note: 7 },
    { text: 'C#', note: 2 },
    { text: 'G#', note: 9 },
    { text: 'D#', note: 4 },
    { text: 'A#', note: 11 },
    { text: 'F',  note: 6 }
  ],
  [
    { text: 'Am', note: 10 },
    { text: 'Em', note: 5 },
    { text: 'Bm', note: 12 },
    { text: 'F#m', note: 7 },
    { text: 'C#m', note: 2 },
    { text: 'G#m', note: 9 },
    { text: 'D#m', note: 4 },
    { text: 'A#m', note: 11 },
    { text: 'Fm', note: 6 },
    { text: 'Cm', note: 1 },
    { text: 'Gm', note: 8 },
    { text: 'Dm', note: 3 }
  ],
  [
    { text: 'Bdim', note: 12 },
    { text: 'F#dim', note: 7 },
    { text: 'C#dim', note: 2 },
    { text: 'G#dim', note: 9 },
    { text: 'D#dim', note: 4 },
    { text: 'A#dim', note: 11 },
    { text: 'Fdim',  note: 6 },
    { text: 'Cdim', note: 1 },
    { text: 'Gdim', note: 8 },
    { text: 'Ddim', note: 3 },
    { text: 'Adim', note: 10 },
    { text: 'Edim', note: 5 }
  ]
]
)}

function _circleWidth(){return(
850
)}

function _innerRadius(){return(
40
)}

function _activeNotesFillColor(){return(
'#54D779'
)}

function _activeNotesColor(){return(
'#30360C'
)}

function _d3(require){return(
require('d3')
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("drawCircle")).define("drawCircle", ["d3","circleWidth","innerRadius","notes","activeNotesFillColor"], _drawCircle);
  main.variable(observer("notes")).define("notes", _notes);
  main.variable(observer("circleWidth")).define("circleWidth", _circleWidth);
  main.variable(observer("innerRadius")).define("innerRadius", _innerRadius);
  main.variable(observer("activeNotesFillColor")).define("activeNotesFillColor", _activeNotesFillColor);
  main.variable(observer("activeNotesColor")).define("activeNotesColor", _activeNotesColor);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  return main;
}
