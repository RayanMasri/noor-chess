import React from 'react';

export default function Transition(props) {
	const path = {
		from: [
			Math.abs((props.player == 'b' ? 1 : 8) - parseInt(animation.from.split('')[1])) * props.cellSize,
			(props.player == 'b' ? 'hgfedcba' : 'abcdefgh').indexOf(animation.from.split('')[0]) * props.cellSize,
		],
		to: [
			Math.abs((props.player == 'b' ? 1 : 8) - parseInt(animation.to.split('')[1])) * props.cellSize,
			(props.player == 'b' ? 'hgfedcba' : 'abcdefgh').indexOf(animation.to.split('')[0]) * props.cellSize,
		],
	};

	// if (!animation.status && animation.from == null) return null;

	// return (
	//     <div
	//         className='move-transition'
	//         style={{
	//             top: `${Math.abs((state.color == 'b' ? 1 : 8) - parseInt(animation[animation.status ? 'from' : 'to'].split('')[1])) * state.cellSize}px`,
	//             left: `${(state.color == 'b' ? 'hgfedcba' : 'abcdefgh').indexOf(animation[animation.status ? 'from' : 'to'].split('')[0]) * state.cellSize}px`,
	//             transition: `${animationTime}s`,
	//         }}
	//         // ref={transition}
	//     >
	//         <img src={require(`../icons/${animation.color}${animation.type}.svg`)}></img>
	//     </div>
	// );

	return !props.animation.status && props.animation.from == null ? null : (
		<div
			className='move-transition'
			// style={{
			// 	transition: `${animationTime}s`,
			// }}
			// ref={transition}
		>
			<img src={require(`../icons/${animation.color}${animation.type}.svg`)}></img>
		</div>
	);
}
