export const idlFactory = ({ IDL }) => {
  const Time = IDL.Int;
  return IDL.Service({ 'get_time' : IDL.Func([], [Time], ['query']) });
};
export const init = ({ IDL }) => { return []; };
