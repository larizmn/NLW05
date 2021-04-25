import { format,parseISO } from 'date-fns'
import { GetStaticPaths, GetStaticProps } from 'next';
import { api } from '../../services/api';
import { convertDurantionToTimeString } from '../../utils/convertDurationToTimeString';
import { usePlayer } from '../../contexts/PlayerContext';
import ptBR from 'date-fns/locale/pt-BR'
import Image from 'next/image';
import Link from 'next/link';
import Head from 'next/head';
import styles from './episode.module.scss';

type Episode = {
    id: string;
    title: string;
    thumbnail: string;
    members: string;
    duration: number;
    durationAsString: string;
    url: string;
    publishedAt: string;
    description: string;
};

type EpisodeProps = {
    episode: Episode,
}

export default function Episode({ episode }: EpisodeProps) {
    const { play } = usePlayer();

    return (
        <div className={styles.episodes}>
            <Head>
                <title>{episode.title} | Podcastr</title>
            </Head>
            <div className={styles.thumbnailContainer}>
                <Link href="/">
                    <button type="button">
                        <img src="/arrow-left.svg" alt="Botão de voltar" />
                    </button>
                </Link>
                <Image 
                    width={700} 
                    height={160} 
                    src={episode.thumbnail} 
                    objectFit="cover"
                />
                <button type="button" onClick={() => play(episode)}>
                    <img src="/play.svg" alt="Botão tocar episódio"/>
                </button>
            </div>

            <header>
                <h1>{episode.title}</h1>
                <span>{episode.members}</span>
                <span>{episode.publishedAt}</span>
                <span>{episode.durationAsString}</span>
            </header>

            <div className={styles.description} dangerouslySetInnerHTML={{ __html: episode.description }}/>
        </div>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    const { data } = await api.get('episodes', {
        params: {
          _limit: 12,
          _sort: 'published_at',
          _order: 'desc',
        }
    })

    const paths = data.map(episode => {
        return {
            params: {
                slug: episode.id
            }
        } 
    })

    return {
        paths,
        fallback: 'blocking'
    }
}

/*
 Quanto passamos os paths vazios o next não gera nenhum episódio de forma estática, o que determina o comportamento de quando uma pessoa acessa a página de um episódio que não foi
 gerado estaticamente, é o "fallback"
 Se utilizarmos o "fallback: false" e uma pessoa tentar acessar uma episódio que não foi passado no "paths" vai retornar 404
 Se utilizarmos o "fallback: true" e o ep não foi gerado de forma estatica/listado no "paths", o next vai tentar buscar os dados desse novo ep que a pessoa está acessando para criar uma página estatica
 desse ep, e salvar em disco. Porém o "true" faz com que a requisição para buscar os dados do ep na API aconteca no lado do cliente
 Se utilizarmos o "fallback: 'blocking'" a requisição para buscar os dados do ep na API será feita no server next.js um servidor node.js, e a pessoa só será redirecionada para o ep
 quando os dados já tiverem sido carregados. (Em questão de SO blocking é o melhor comando) Incremental static regenaration
*/

export const getStaticProps: GetStaticProps = async (ctx) => {
    const { slug } = ctx.params;

    const { data } = await api.get(`/episodes/${slug}`)

    const episode = {
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        members: data.members,
        publishedAt: format(parseISO(data.published_at), 'd MMM yy', { locale: ptBR }),
        duration: Number(data.file.duration),
        durationAsString: convertDurantionToTimeString(Number(data.file.duration)),
        description: data.description,
        url: data.file.url,
    };
    
    return {
        props: {
            episode,
        },
        revalidate: 60 * 60 * 24,
    }
    
}