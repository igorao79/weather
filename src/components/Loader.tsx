import '../styles/components/loader.scss';

interface LoaderProps {
  message?: string;
}

const Loader = ({ message = 'Загрузка данных о погоде...' }: LoaderProps) => {
  return (
    <div className="loader">
      <div className="loader__content">
        <div className="loader__spinner"></div>
        <div className="loader__text">{message}</div>
      </div>
    </div>
  );
};

export default Loader; 